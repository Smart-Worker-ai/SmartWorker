/**
 * Webhook routes — receive delivery receipts from SMS providers.
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../../models/database';
import { logger } from '../../utils/logger';
import { MessageStatus, ProviderName } from '../../types';

const router = Router();

/**
 * POST /api/v1/webhooks/dlr/:provider
 * Receive delivery receipt from a provider.
 */
router.post('/dlr/:provider', async (req: Request, res: Response) => {
  const providerName = req.params.provider as ProviderName;
  const payload = req.body;

  logger.info('DLR webhook received', { provider: providerName });

  try {
    const { messageId, status } = parseDlrPayload(providerName, payload);

    if (messageId && status) {
      const db = getDb();
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date(),
      };

      if (status === MessageStatus.DELIVERED) {
        updateData.delivered_at = new Date();
      }

      await db('messages')
        .where('provider_message_id', messageId)
        .update(updateData);

      logger.info('DLR processed', { providerMessageId: messageId, status });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('DLR processing failed', { provider: providerName, error });
    res.status(200).json({ received: true }); // Always 200 to prevent provider retries
  }
});

function parseDlrPayload(provider: ProviderName, payload: any): {
  messageId: string | null;
  status: MessageStatus | null;
} {
  switch (provider) {
    case ProviderName.TWILIO:
      return {
        messageId: payload.MessageSid || payload.SmsSid,
        status: mapTwilioStatus(payload.MessageStatus),
      };
    case ProviderName.PLIVO:
      return {
        messageId: payload.MessageUUID,
        status: mapGenericStatus(payload.Status),
      };
    default:
      return {
        messageId: payload.message_id || payload.messageId,
        status: mapGenericStatus(payload.status),
      };
  }
}

function mapTwilioStatus(status: string): MessageStatus {
  switch (status) {
    case 'sent': case 'queued': return MessageStatus.SENT;
    case 'delivered': return MessageStatus.DELIVERED;
    case 'failed': case 'undelivered': return MessageStatus.FAILED;
    default: return MessageStatus.UNKNOWN;
  }
}

function mapGenericStatus(status: string): MessageStatus {
  const s = (status || '').toLowerCase();
  if (s.includes('deliver')) return MessageStatus.DELIVERED;
  if (s.includes('fail') || s.includes('reject')) return MessageStatus.FAILED;
  if (s.includes('sent') || s.includes('submit')) return MessageStatus.SENT;
  return MessageStatus.UNKNOWN;
}

export default router;
