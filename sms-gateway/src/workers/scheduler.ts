/**
 * Scheduler — periodic tasks for DLR timeouts, OTP expiry, and cleanup.
 * Runs as a single-replica process separate from workers.
 */

import { getDb } from '../models/database';
import { logger } from '../utils/logger';
import { config } from '../config';
import { OtpStatus, MessageStatus } from '../types';
import { initializeProviders } from '../providers';
import { dlqSize } from '../utils/metrics';

const INTERVALS = {
  OTP_EXPIRY: 60_000,     // Every 1 minute
  DLR_TIMEOUT: 120_000,   // Every 2 minutes
  CLEANUP: 3600_000,      // Every 1 hour
  DLQ_MONITOR: 30_000,    // Every 30 seconds
};

/**
 * Expire pending OTPs that have passed their expiry time.
 */
async function expireOtps(): Promise<void> {
  try {
    const db = getDb();
    const count = await db('otp_records')
      .where('status', OtpStatus.PENDING)
      .where('expires_at', '<', new Date())
      .update({ status: OtpStatus.EXPIRED, updated_at: new Date() });

    if (count > 0) {
      logger.info(`Expired ${count} OTP records`);
    }
  } catch (error) {
    logger.error('OTP expiry task failed', { error });
  }
}

/**
 * Check for messages stuck in 'sent' status without DLR.
 * Marks them as 'unknown' after timeout.
 */
async function checkDlrTimeouts(): Promise<void> {
  try {
    const db = getDb();

    // OTP messages: 60s timeout
    const otpTimeout = new Date(Date.now() - 60_000);
    const otpCount = await db('messages')
      .where('status', MessageStatus.SENT)
      .where('priority', 'otp')
      .where('sent_at', '<', otpTimeout)
      .update({ status: MessageStatus.UNKNOWN, updated_at: new Date() });

    // Transactional messages: 300s timeout
    const txTimeout = new Date(Date.now() - 300_000);
    const txCount = await db('messages')
      .where('status', MessageStatus.SENT)
      .where('priority', '!=', 'otp')
      .where('sent_at', '<', txTimeout)
      .update({ status: MessageStatus.UNKNOWN, updated_at: new Date() });

    if (otpCount + txCount > 0) {
      logger.info(`DLR timeout: ${otpCount} OTP, ${txCount} transactional messages marked unknown`);
    }
  } catch (error) {
    logger.error('DLR timeout check failed', { error });
  }
}

/**
 * Monitor DLQ depth and update metrics.
 */
async function monitorDlq(): Promise<void> {
  try {
    const db = getDb();
    const result = await db('messages')
      .where('status', MessageStatus.DLQ)
      .count('id as count')
      .first();

    const count = parseInt(result?.count as string, 10) || 0;
    dlqSize.set(count);

    if (count > 0) {
      logger.warn(`DLQ has ${count} messages pending review`);
    }
  } catch (error) {
    logger.error('DLQ monitor failed', { error });
  }
}

/**
 * Cleanup old records beyond retention period.
 */
async function cleanupOldRecords(): Promise<void> {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - 30 * 24 * 3600_000); // 30 days

    // Clean expired/verified OTPs older than retention
    const otpCount = await db('otp_records')
      .where('status', 'in', [OtpStatus.EXPIRED, OtpStatus.VERIFIED, OtpStatus.MAX_ATTEMPTS])
      .where('created_at', '<', cutoff)
      .del();

    if (otpCount > 0) {
      logger.info(`Cleaned up ${otpCount} old OTP records`);
    }
  } catch (error) {
    logger.error('Cleanup task failed', { error });
  }
}

/**
 * Start the scheduler with all periodic tasks.
 */
export function startScheduler(): void {
  logger.info('Starting scheduler...');

  setInterval(expireOtps, INTERVALS.OTP_EXPIRY);
  setInterval(checkDlrTimeouts, INTERVALS.DLR_TIMEOUT);
  setInterval(monitorDlq, INTERVALS.DLQ_MONITOR);
  setInterval(cleanupOldRecords, INTERVALS.CLEANUP);

  // Run immediately on startup
  expireOtps();
  monitorDlq();

  logger.info('Scheduler started with periodic tasks');
}

// Allow running as standalone process
if (require.main === module) {
  logger.info('Starting scheduler process...');
  initializeProviders();
  startScheduler();
}
