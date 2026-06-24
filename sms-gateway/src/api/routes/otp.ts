/**
 * OTP API routes — send and verify OTPs.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { otpService } from '../../services/otpService';

const router = Router();

const sendOtpSchema = z.object({
  phone: z.string().min(5).max(20),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(5).max(20),
  otp: z.string().min(4).max(8),
  tenantId: z.string().optional(),
});

/**
 * POST /api/v1/otp/send
 * Send an OTP to a phone number.
 */
router.post('/send', async (req: Request, res: Response) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      requestId: (req as any).correlationId,
    });
    return;
  }

  const result = await otpService.sendOtp({
    phone: parsed.data.phone,
    tenantId: parsed.data.tenantId,
    ipAddress: req.ip || req.socket.remoteAddress || '0.0.0.0',
    userAgent: req.headers['user-agent'],
    userId: parsed.data.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
    requestId: (req as any).correlationId,
  });
});

/**
 * POST /api/v1/otp/verify
 * Verify an OTP.
 */
router.post('/verify', async (req: Request, res: Response) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
      requestId: (req as any).correlationId,
    });
    return;
  }

  const result = await otpService.verifyOtp({
    phone: parsed.data.phone,
    otp: parsed.data.otp,
    tenantId: parsed.data.tenantId,
    ipAddress: req.ip || req.socket.remoteAddress || '0.0.0.0',
  });

  res.status(200).json({
    success: true,
    data: result,
    requestId: (req as any).correlationId,
  });
});

export default router;
