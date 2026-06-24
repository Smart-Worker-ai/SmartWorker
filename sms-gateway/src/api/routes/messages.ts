/**
 * Message API routes — send messages and check status.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { messageService } from '../../services/messageService';
import { MessageChannel, MessagePriority } from '../../types';

const router = Router();

const sendMessageSchema = z.object({
  to: z.string().min(5).max(20),
  body: z.string().min(1).max(1600),
  channel: z.nativeEnum(MessageChannel).optional(),
  priority: z.nativeEnum(MessagePriority).optional(),
  idempotencyKey: z.string().min(1).max(255),
  tenantId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * POST /api/v1/messages/send
 */
router.post('/send', async (req: Request, res: Response) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      requestId: (req as any).correlationId,
    });
    return;
  }

  const result = await messageService.sendMessage(
    parsed.data,
    req.ip || req.socket.remoteAddress || '0.0.0.0'
  );

  res.status(202).json({
    success: true,
    data: result,
    requestId: (req as any).correlationId,
  });
});

/**
 * GET /api/v1/messages/:id/status
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  const record = await messageService.getMessageStatus(req.params.id as string);

  if (!record) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Message not found' },
      requestId: (req as any).correlationId,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      messageId: record.id,
      status: record.status,
      provider: record.providerName,
      sentAt: record.sentAt,
      deliveredAt: record.deliveredAt,
    },
    requestId: (req as any).correlationId,
  });
});

export default router;
