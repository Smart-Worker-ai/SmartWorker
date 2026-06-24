/**
 * Global error handler middleware.
 * Catches all unhandled errors and returns consistent JSON responses.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { OtpError } from '../../services/otpService';
import { MessageError } from '../../services/messageService';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = (req as any).correlationId || 'unknown';

  if (err instanceof OtpError || err instanceof MessageError) {
    res.status((err as any).statusCode || 400).json({
      success: false,
      error: { code: (err as any).code, message: err.message },
      requestId: correlationId,
    });
    return;
  }

  logger.error('Unhandled error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
    requestId: correlationId,
  });
}

/**
 * Correlation ID middleware — attaches a unique ID to every request for tracing.
 */
export function correlationId(req: Request, _res: Response, next: NextFunction): void {
  const id = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  (req as any).correlationId = id;
  next();
}
