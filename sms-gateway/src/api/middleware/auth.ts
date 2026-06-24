/**
 * HMAC authentication middleware.
 * Validates signed requests with timestamp + nonce to prevent replay attacks.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyHmacSignature } from '../../utils/crypto';
import { getRedis } from '../../models/redis';
import { logger } from '../../utils/logger';
import { config } from '../../config';

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function hmacAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip auth in development if no HMAC header present
  if (config.isDevelopment && !req.headers['x-signature']) {
    return next();
  }

  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const nonce = req.headers['x-nonce'] as string;

  if (!signature || !timestamp || !nonce) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing authentication headers' },
    });
    return;
  }

  // Reject stale timestamps
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime) || Math.abs(Date.now() - requestTime) > TIMESTAMP_WINDOW_MS) {
    res.status(401).json({
      success: false,
      error: { code: 'TIMESTAMP_EXPIRED', message: 'Request timestamp is outside the allowed window' },
    });
    return;
  }

  // Reject replayed nonces
  const redis = getRedis();
  const nonceKey = `nonce:${nonce}`;
  const nonceExists = await redis.exists(nonceKey);
  if (nonceExists) {
    res.status(401).json({
      success: false,
      error: { code: 'NONCE_REUSED', message: 'Request nonce has already been used' },
    });
    return;
  }

  // Verify HMAC signature
  const body = JSON.stringify(req.body || {});
  const isValid = verifyHmacSignature(body, timestamp, nonce, signature);

  if (!isValid) {
    logger.warn('HMAC signature verification failed', { ip: req.ip });
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_SIGNATURE', message: 'Request signature verification failed' },
    });
    return;
  }

  // Store nonce to prevent replay (TTL matches timestamp window)
  await redis.setex(nonceKey, Math.ceil(TIMESTAMP_WINDOW_MS / 1000), '1');

  next();
}
