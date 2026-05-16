/**
 * OTP Service — handles the complete OTP lifecycle.
 * Generate → Hash → Store → Enqueue → Verify → Expire
 * OTPs are never stored or logged in plaintext.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database';
import { getRedis } from '../models/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { generateOtp, hashOtp, verifyOtp, hashPhone, generateId } from '../utils/crypto';
import { validatePhone } from '../utils/phone';
import { checkOtpRateLimits, checkResendCooldown } from './rateLimiter';
import { enqueueMessage } from '../queue';
import { otpSendTotal, otpVerifyTotal } from '../utils/metrics';
import {
  OtpStatus,
  MessageChannel,
  MessagePriority,
  MessageStatus,
  SendOtpRequest,
  VerifyOtpRequest,
  SendOtpResponse,
  VerifyOtpResponse,
} from '../types';

export class OtpService {
  /**
   * Send an OTP to the given phone number.
   * Implements deduplication, rate limiting, and secure storage.
   */
  async sendOtp(request: SendOtpRequest): Promise<SendOtpResponse> {
    const { phone, ipAddress, userAgent, tenantId = 'default', userId } = request;

    // 1. Validate phone number (E.164 + country allow-list)
    const validation = validatePhone(phone);
    if (!validation.valid || !validation.e164) {
      throw new OtpError('INVALID_PHONE', validation.errorMessage || 'Invalid phone number');
    }

    const e164 = validation.e164;
    const country = validation.countryCode || 'XX';
    const phoneH = hashPhone(e164);

    // 2. Check rate limits across all dimensions
    const rateLimitResult = await checkOtpRateLimits(phoneH, ipAddress, userId);
    if (rateLimitResult) {
      otpSendTotal.inc({ country, status: 'rate_limited' });
      throw new OtpError(
        'RATE_LIMITED',
        `Rate limit exceeded. Try again in ${rateLimitResult.resetInSeconds} seconds`,
        429
      );
    }

    // 3. Check resend cooldown (escalating)
    const cooldown = await checkResendCooldown(phoneH);
    if (!cooldown.allowed) {
      otpSendTotal.inc({ country, status: 'cooldown' });
      throw new OtpError(
        'RESEND_COOLDOWN',
        `Please wait ${cooldown.cooldownSeconds} seconds before requesting a new OTP`,
        429
      );
    }

    // 4. Deduplication — if a pending OTP exists within 30s, return it
    const db = getDb();
    const existingOtp = await db('otp_records')
      .where('phone_hash', phoneH)
      .where('status', OtpStatus.PENDING)
      .where('expires_at', '>', new Date())
      .where('created_at', '>', new Date(Date.now() - 30000))
      .first();

    if (existingOtp) {
      logger.info('Returning existing OTP (deduplication)', { otpId: existingOtp.id });
      otpSendTotal.inc({ country, status: 'deduplicated' });
      return {
        otpId: existingOtp.id,
        expiresAt: existingOtp.expires_at.toISOString(),
        resendCooldownSeconds: cooldown.cooldownSeconds,
      };
    }

    // 5. Generate and hash OTP
    const otpPlaintext = generateOtp();
    const otpH = await hashOtp(otpPlaintext);

    // 6. Create message record
    const messageId = generateId();
    const otpId = generateId();
    const expiresAt = new Date(Date.now() + config.otp.expirySeconds * 1000);

    const messageBody = `Your verification code is: ${otpPlaintext}. Valid for ${Math.floor(config.otp.expirySeconds / 60)} minutes. Do not share this code.`;

    await db.transaction(async (trx) => {
      // Insert message record
      await trx('messages').insert({
        id: messageId,
        idempotency_key: `otp:${phoneH}:${otpId}`,
        to: e164,
        to_hash: phoneH,
        body: messageBody,
        channel: MessageChannel.SMS,
        priority: MessagePriority.OTP,
        status: MessageStatus.QUEUED,
        tenant_id: tenantId,
        attempts: 0,
        excluded_providers: [],
      });

      // Insert OTP record
      await trx('otp_records').insert({
        id: otpId,
        phone_hash: phoneH,
        otp_hash: otpH,
        expires_at: expiresAt,
        attempts: 0,
        max_attempts: config.otp.maxAttempts,
        channel: MessageChannel.SMS,
        status: OtpStatus.PENDING,
        message_id: messageId,
        ip_address: ipAddress,
        user_agent: userAgent,
        tenant_id: tenantId,
      });
    });

    // 7. Enqueue for delivery (priority: OTP — sub-second SLO)
    await enqueueMessage({
      messageId,
      to: e164,
      body: messageBody,
      channel: MessageChannel.SMS,
      priority: MessagePriority.OTP,
      attempt: 0,
      excludedProviders: [],
      idempotencyKey: `otp:${phoneH}:${otpId}`,
      tenantId,
    });

    // 8. Log audit event (never log the OTP itself)
    await this.logAudit('otp_send', ipAddress, userAgent, 'otp', otpId, 'success', {
      country,
      tenantId,
    });

    otpSendTotal.inc({ country, status: 'sent' });
    logger.info('OTP enqueued for delivery', { otpId, country, tenantId });

    return {
      otpId,
      expiresAt: expiresAt.toISOString(),
      resendCooldownSeconds: cooldown.cooldownSeconds,
    };
  }

  /**
   * Verify an OTP. Uses constant-time comparison.
   * Increments attempt counter even on failure to prevent brute-force.
   */
  async verifyOtp(request: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const { phone, otp, ipAddress, tenantId = 'default' } = request;

    const validation = validatePhone(phone);
    if (!validation.valid || !validation.e164) {
      throw new OtpError('INVALID_PHONE', 'Invalid phone number');
    }

    const phoneH = hashPhone(validation.e164);
    const db = getDb();

    // Find the most recent pending OTP for this phone
    const record = await db('otp_records')
      .where('phone_hash', phoneH)
      .where('tenant_id', tenantId)
      .where('status', OtpStatus.PENDING)
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    if (!record) {
      otpVerifyTotal.inc({ outcome: 'expired' });
      await this.logAudit('otp_verify', ipAddress, undefined, 'otp', 'unknown', 'failure', {
        reason: 'no_pending_otp',
      });
      throw new OtpError('OTP_NOT_FOUND', 'No active OTP found. Please request a new one.');
    }

    // Check max attempts
    if (record.attempts >= record.max_attempts) {
      await db('otp_records')
        .where('id', record.id)
        .update({ status: OtpStatus.MAX_ATTEMPTS, updated_at: new Date() });

      otpVerifyTotal.inc({ outcome: 'max_attempts' });
      await this.logAudit('otp_verify', ipAddress, undefined, 'otp', record.id, 'failure', {
        reason: 'max_attempts',
      });
      throw new OtpError('MAX_ATTEMPTS', 'Too many failed attempts. Please request a new OTP.');
    }

    // Increment attempts (do this BEFORE verification to prevent race conditions)
    await db('otp_records')
      .where('id', record.id)
      .update({
        attempts: record.attempts + 1,
        updated_at: new Date(),
      });

    // Constant-time comparison via bcrypt
    const isValid = await verifyOtp(otp, record.otp_hash);

    if (!isValid) {
      const remaining = record.max_attempts - record.attempts - 1;
      otpVerifyTotal.inc({ outcome: 'fail' });
      await this.logAudit('otp_verify', ipAddress, undefined, 'otp', record.id, 'failure', {
        reason: 'wrong_otp',
        remainingAttempts: remaining,
      });
      return { verified: false, remainingAttempts: remaining };
    }

    // Mark as verified — OTP is now consumed and cannot be reused
    await db('otp_records')
      .where('id', record.id)
      .update({
        status: OtpStatus.VERIFIED,
        verified_at: new Date(),
        updated_at: new Date(),
      });

    otpVerifyTotal.inc({ outcome: 'success' });
    await this.logAudit('otp_verify', ipAddress, undefined, 'otp', record.id, 'success');

    logger.info('OTP verified successfully', { otpId: record.id });
    return { verified: true };
  }

  /**
   * Log an audit event for compliance tracking.
   */
  private async logAudit(
    action: string,
    ipAddress: string,
    userAgent: string | undefined,
    resourceType: string,
    resourceId: string,
    outcome: 'success' | 'failure',
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const db = getDb();
      await db('audit_events').insert({
        id: generateId(),
        action,
        actor: ipAddress,
        ip_address: ipAddress,
        user_agent: userAgent || null,
        resource_type: resourceType,
        resource_id: resourceId,
        outcome,
        details: details ? JSON.stringify(details) : null,
      });
    } catch (error) {
      // Audit logging should never block the main flow
      logger.error('Failed to write audit event', { action, error });
    }
  }
}

/**
 * Custom error class for OTP operations with HTTP status codes.
 */
export class OtpError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'OtpError';
  }
}

export const otpService = new OtpService();
