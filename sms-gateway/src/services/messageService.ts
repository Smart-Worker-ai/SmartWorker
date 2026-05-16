/**
 * Message Service — handles generic message sending with routing and idempotency.
 */

import { getDb } from '../models/database';
import { getRedis } from '../models/redis';
import { enqueueMessage } from '../queue';
import { checkSendRateLimits } from './rateLimiter';
import { validatePhone } from '../utils/phone';
import { hashPhone, generateId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { smsRequestsTotal } from '../utils/metrics';
import {
  SendMessageRequest, MessageChannel, MessagePriority,
  MessageStatus, MessageRecord,
} from '../types';

export class MessageService {
  async sendMessage(request: SendMessageRequest, ipAddress: string): Promise<{ messageId: string }> {
    const {
      to, body, channel = MessageChannel.SMS,
      priority = MessagePriority.TRANSACTIONAL,
      idempotencyKey, tenantId = 'default', metadata,
    } = request;

    const validation = validatePhone(to);
    if (!validation.valid || !validation.e164) {
      throw new MessageError('INVALID_PHONE', validation.errorMessage || 'Invalid phone number');
    }

    const e164 = validation.e164;
    const country = validation.countryCode || 'XX';
    const phoneH = hashPhone(e164);

    // Idempotency check
    const redis = getRedis();
    const existingId = await redis.get(`idempotency:${idempotencyKey}`);
    if (existingId) {
      logger.info('Returning idempotent response', { idempotencyKey, messageId: existingId });
      return { messageId: existingId };
    }

    // Rate limit check
    const rl = await checkSendRateLimits(phoneH, ipAddress, tenantId);
    if (rl) {
      smsRequestsTotal.inc({ tenant: tenantId, channel, country, status: 'rate_limited' });
      throw new MessageError('RATE_LIMITED', `Rate limit exceeded. Retry in ${rl.resetInSeconds}s`, 429);
    }

    const messageId = generateId();
    const db = getDb();

    await db('messages').insert({
      id: messageId, idempotency_key: idempotencyKey, to: e164, to_hash: phoneH,
      body, channel, priority, status: MessageStatus.QUEUED, tenant_id: tenantId,
      attempts: 0, excluded_providers: [], metadata: metadata ? JSON.stringify(metadata) : null,
    });

    await redis.setex(`idempotency:${idempotencyKey}`, 600, messageId);

    await enqueueMessage({
      messageId, to: e164, body, channel, priority,
      attempt: 0, excludedProviders: [], idempotencyKey, tenantId,
    });

    smsRequestsTotal.inc({ tenant: tenantId, channel, country, status: 'queued' });
    logger.info('Message enqueued', { messageId, priority, channel, country });
    return { messageId };
  }

  async getMessageStatus(messageId: string): Promise<MessageRecord | null> {
    const db = getDb();
    const r = await db('messages').where('id', messageId).first();
    if (!r) return null;
    return {
      id: r.id, idempotencyKey: r.idempotency_key, to: '[REDACTED]',
      toHash: r.to_hash, body: '[REDACTED]', channel: r.channel,
      priority: r.priority, status: r.status, tenantId: r.tenant_id,
      providerName: r.provider_name, providerMessageId: r.provider_message_id,
      attempts: r.attempts, excludedProviders: r.excluded_providers || [],
      metadata: r.metadata, errorMessage: r.error_message, costUsd: r.cost_usd,
      createdAt: r.created_at, updatedAt: r.updated_at,
      sentAt: r.sent_at, deliveredAt: r.delivered_at,
    };
  }
}

export class MessageError extends Error {
  code: string;
  statusCode: number;
  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'MessageError';
  }
}

export const messageService = new MessageService();
