/**
 * BullMQ-based message queue with priority lanes.
 * Each priority level gets a dedicated queue for strict ordering.
 * Workers consume lanes in priority order: otp > transactional > notification > bulk.
 */

import { Queue, QueueEvents } from 'bullmq';
import { getRedis } from '../models/redis';
import { MessagePriority, SendMessageJob, DlrCheckJob } from '../types';
import { logger } from '../utils/logger';
import { queueDepth } from '../utils/metrics';

const QUEUE_PREFIX = 'sms-gw';
const queues = new Map<string, Queue>();

function getQueueName(priority: MessagePriority): string {
  return `${QUEUE_PREFIX}:${priority}`;
}

function getOrCreateQueue(priority: MessagePriority): Queue {
  const name = getQueueName(priority);
  if (!queues.has(name)) {
    const queue = new Queue(name, {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 200,
        },
      },
    });
    queues.set(name, queue);
    logger.info(`Queue created: ${name}`);
  }
  return queues.get(name)!;
}

/**
 * Enqueue a message for delivery.
 */
export async function enqueueMessage(job: SendMessageJob): Promise<string> {
  const queue = getOrCreateQueue(job.priority);

  const bullJob = await queue.add('send-message', job, {
    jobId: job.idempotencyKey,
    priority: getPriorityWeight(job.priority),
    attempts: 3,
    backoff: { type: 'exponential', delay: 200 },
  });

  logger.info(`Message enqueued`, {
    messageId: job.messageId,
    priority: job.priority,
    queue: queue.name,
    jobId: bullJob.id,
  });

  return bullJob.id!;
}

/**
 * Enqueue a DLR timeout check.
 */
export async function enqueueDlrCheck(job: DlrCheckJob): Promise<void> {
  const queue = getOrCreateQueue(MessagePriority.TRANSACTIONAL);

  await queue.add('dlr-check', job, {
    delay: job.timeoutMs,
    attempts: 1,
  });
}

/**
 * Get current queue depths for all lanes.
 */
export async function getQueueDepths(): Promise<Record<string, number>> {
  const depths: Record<string, number> = {};

  for (const priority of Object.values(MessagePriority)) {
    const queue = getOrCreateQueue(priority);
    const waiting = await queue.getWaitingCount();
    const active = await queue.getActiveCount();
    depths[priority] = waiting + active;
    queueDepth.set({ lane: priority }, depths[priority]);
  }

  return depths;
}

/**
 * Get queue instances for worker consumption.
 */
export function getQueue(priority: MessagePriority): Queue {
  return getOrCreateQueue(priority);
}

/**
 * Gracefully close all queues.
 */
export async function closeQueues(): Promise<void> {
  for (const [name, queue] of queues) {
    await queue.close();
    logger.info(`Queue closed: ${name}`);
  }
  queues.clear();
}

/**
 * Lower number = higher priority in BullMQ.
 */
function getPriorityWeight(priority: MessagePriority): number {
  switch (priority) {
    case MessagePriority.OTP: return 1;
    case MessagePriority.TRANSACTIONAL: return 5;
    case MessagePriority.NOTIFICATION: return 10;
    case MessagePriority.BULK: return 20;
    default: return 10;
  }
}
