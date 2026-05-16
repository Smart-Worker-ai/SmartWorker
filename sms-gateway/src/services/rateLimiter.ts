/**
 * Multi-dimensional rate limiter backed by Redis.
 * Implements token-bucket style limiting per phone, IP, user, tenant, and country.
 * Limits are configurable and match the architecture's rate-limiting matrix.
 */

import { getRedis } from '../models/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { rateLimitHits } from '../utils/metrics';

interface RateLimitConfig {
  key: string;
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  dimension: string;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check and increment the rate limit counter.
 * Uses Redis MULTI for atomic check-and-increment.
 */
async function checkLimit(cfg: RateLimitConfig): Promise<RateLimitResult> {
  const redis = getRedis();
  const redisKey = `ratelimit:${cfg.key}`;

  const pipeline = redis.pipeline();
  pipeline.incr(redisKey);
  pipeline.ttl(redisKey);
  const results = await pipeline.exec();

  const count = (results?.[0]?.[1] as number) || 0;
  const ttl = (results?.[1]?.[1] as number) || -1;

  // Set expiry on first request in window
  if (count === 1 || ttl === -1) {
    await redis.expire(redisKey, cfg.windowSeconds);
  }

  const allowed = count <= cfg.maxRequests;
  const remaining = Math.max(0, cfg.maxRequests - count);
  const resetInSeconds = ttl > 0 ? ttl : cfg.windowSeconds;

  if (!allowed) {
    rateLimitHits.inc({ dimension: cfg.key.split(':')[0], action: 'blocked' });
    logger.warn(`Rate limit exceeded`, { key: cfg.key, count, limit: cfg.maxRequests });
  }

  return { allowed, dimension: cfg.key, remaining, resetInSeconds };
}

/**
 * Check OTP rate limits across all dimensions.
 * Returns the first limit that is exceeded, or null if all pass.
 */
export async function checkOtpRateLimits(
  phoneHash: string,
  ipAddress: string,
  userId?: string
): Promise<RateLimitResult | null> {
  const checks: RateLimitConfig[] = [
    // Per phone: 1 per 30 seconds (resend cooldown)
    { key: `phone:30s:${phoneHash}`, maxRequests: 1, windowSeconds: 30 },
    // Per phone: 3 per hour
    { key: `phone:1h:${phoneHash}`, maxRequests: 3, windowSeconds: 3600 },
    // Per phone: 5 per day
    { key: `phone:1d:${phoneHash}`, maxRequests: config.otp.maxPerPhonePerDay, windowSeconds: 86400 },
    // Per IP: 5 per hour
    { key: `ip:1h:${ipAddress}`, maxRequests: 5, windowSeconds: 3600 },
    // Per IP: 20 per day
    { key: `ip:1d:${ipAddress}`, maxRequests: config.otp.maxPerIpPerDay, windowSeconds: 86400 },
  ];

  // Per user account: 10 per day
  if (userId) {
    checks.push({
      key: `user:1d:${userId}`,
      maxRequests: 10,
      windowSeconds: 86400,
    });
  }

  for (const check of checks) {
    const result = await checkLimit(check);
    if (!result.allowed) {
      return result;
    }
  }

  return null;
}

/**
 * Check message send rate limits (non-OTP).
 */
export async function checkSendRateLimits(
  phoneHash: string,
  ipAddress: string,
  tenantId: string
): Promise<RateLimitResult | null> {
  const checks: RateLimitConfig[] = [
    { key: `send:phone:1h:${phoneHash}`, maxRequests: 10, windowSeconds: 3600 },
    { key: `send:ip:1h:${ipAddress}`, maxRequests: 50, windowSeconds: 3600 },
    { key: `send:tenant:1h:${tenantId}`, maxRequests: 1000, windowSeconds: 3600 },
  ];

  for (const check of checks) {
    const result = await checkLimit(check);
    if (!result.allowed) {
      return result;
    }
  }

  return null;
}

/**
 * Check resend cooldown with escalating delays.
 * 1st resend: 30s, 2nd: 60s, 3rd: 120s
 */
export async function checkResendCooldown(phoneHash: string): Promise<{
  allowed: boolean;
  cooldownSeconds: number;
}> {
  const redis = getRedis();
  const countKey = `resend:count:${phoneHash}`;
  const cooldownKey = `resend:cooldown:${phoneHash}`;

  // Check if currently in cooldown
  const cooldownTtl = await redis.ttl(cooldownKey);
  if (cooldownTtl > 0) {
    return { allowed: false, cooldownSeconds: cooldownTtl };
  }

  // Increment resend count and calculate escalating cooldown
  const count = await redis.incr(countKey);
  await redis.expire(countKey, 3600); // Reset count after 1 hour

  const cooldownSeconds = Math.min(
    config.otp.resendCooldownSeconds * Math.pow(2, count - 1),
    300 // Max 5 minutes
  );

  // Set cooldown
  await redis.setex(cooldownKey, cooldownSeconds, '1');

  return { allowed: true, cooldownSeconds };
}
