/**
 * Redis connection manager.
 * Provides separate logical connections for queue, rate-limiting, and cache.
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let redisSub: Redis | null = null;

function createRedisConnection(name: string): Redis {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    tls: config.redis.tls ? {} : undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      logger.warn(`Redis ${name} reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    lazyConnect: false,
  });

  client.on('connect', () => logger.info(`Redis ${name} connected`));
  client.on('error', (err) => logger.error(`Redis ${name} error: ${err.message}`));
  client.on('close', () => logger.warn(`Redis ${name} connection closed`));

  return client;
}

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = createRedisConnection('main');
  }
  return redisClient;
}

export function getRedisSubscriber(): Redis {
  if (!redisSub) {
    redisSub = createRedisConnection('subscriber');
  }
  return redisSub;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisSub) {
    await redisSub.quit();
    redisSub = null;
  }
  logger.info('Redis connections closed');
}
