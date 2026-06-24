/**
 * Health check and system status routes.
 */

import { Router, Request, Response } from 'express';
import { checkDbHealth } from '../../models/database';
import { checkRedisHealth } from '../../models/redis';
import { getQueueDepths } from '../../queue';
import { metricsRegistry } from '../../utils/metrics';
import { config } from '../../config';

const router = Router();

/**
 * GET /health — basic liveness probe
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /health/ready — readiness probe (checks dependencies)
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  const [dbOk, redisOk] = await Promise.all([checkDbHealth(), checkRedisHealth()]);

  const ready = dbOk && redisOk;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'degraded',
    checks: { database: dbOk, redis: redisOk },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/status — detailed system status
 */
router.get('/health/status', async (_req: Request, res: Response) => {
  const [dbOk, redisOk, queueDepths] = await Promise.all([
    checkDbHealth(), checkRedisHealth(), getQueueDepths().catch(() => ({})),
  ]);

  res.status(200).json({
    service: 'sms-gateway',
    version: '1.0.0',
    environment: config.env,
    uptime: process.uptime(),
    checks: { database: dbOk, redis: redisOk },
    queues: queueDepths,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /metrics — Prometheus metrics endpoint
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  if (!config.metrics.enabled) {
    res.status(404).json({ error: 'Metrics disabled' });
    return;
  }
  res.set('Content-Type', metricsRegistry.contentType);
  const metrics = await metricsRegistry.metrics();
  res.end(metrics);
});

export default router;
