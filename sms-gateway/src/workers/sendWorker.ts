/**
 * Message send worker — consumes messages from the priority queue and dispatches
 * them through the routing/policy engine to SMS providers.
 * Implements retry with provider failover and circuit breaker integration.
 */

import { Worker, Job } from 'bullmq';
import { getRedis } from '../models/redis';
import { getDb } from '../models/database';
import { getProvidersForCountry } from '../providers';
import { isCircuitClosed, recordSuccess, recordFailure } from '../utils/circuitBreaker';
import { getCountryFromE164 } from '../utils/phone';
import { logger } from '../utils/logger';
import { smsSendLatency, smsCostTotal, smsRequestsTotal } from '../utils/metrics';
import { SendMessageJob, MessageStatus, MessagePriority, ProviderName } from '../types';
import { config } from '../config';

const MAX_PROVIDER_ATTEMPTS = 3;

/**
 * Process a send-message job.
 * Routes through available providers with circuit breaker checks.
 */
async function processSendMessage(job: Job<SendMessageJob>): Promise<void> {
  const data = job.data;
  const country = getCountryFromE164(data.to) || 'XX';
  const reqLogger = logger.child({ messageId: data.messageId, jobId: job.id });

  reqLogger.info('Processing message', { priority: data.priority, attempt: data.attempt });

  const db = getDb();

  // Mark as processing
  await db('messages').where('id', data.messageId).update({
    status: MessageStatus.PROCESSING,
    updated_at: new Date(),
  });

  // Get available providers (excludes already-tried ones)
  const providers = getProvidersForCountry(country, data.excludedProviders);
  if (providers.length === 0) {
    reqLogger.error('No providers available — sending to DLQ');
    await db('messages').where('id', data.messageId).update({
      status: MessageStatus.DLQ,
      error_message: 'All providers exhausted',
      updated_at: new Date(),
    });
    smsRequestsTotal.inc({ tenant: data.tenantId, channel: data.channel, country, status: 'dlq' });
    return;
  }

  // Try each provider in order
  for (const provider of providers) {
    if (!isCircuitClosed(provider.name, country)) {
      reqLogger.debug(`Skipping ${provider.name} — circuit open`);
      continue;
    }

    const startTime = Date.now();

    try {
      reqLogger.info(`Attempting send via ${provider.name}`);
      const result = await provider.send(data.to, data.body);
      const latency = (Date.now() - startTime) / 1000;

      smsSendLatency.observe({ provider: provider.name, country }, latency);

      if (result.success) {
        recordSuccess(provider.name, country);

        await db('messages').where('id', data.messageId).update({
          status: MessageStatus.SENT,
          provider_name: provider.name,
          provider_message_id: result.providerMessageId,
          cost_usd: result.costUsd || 0,
          sent_at: new Date(),
          updated_at: new Date(),
        });

        if (result.costUsd) {
          smsCostTotal.inc({ provider: provider.name, country }, result.costUsd);
        }

        smsRequestsTotal.inc({
          tenant: data.tenantId, channel: data.channel, country, status: 'sent',
        });

        reqLogger.info(`Message sent via ${provider.name}`, {
          providerMessageId: result.providerMessageId,
          latencyMs: Math.round(latency * 1000),
        });
        return;
      }

      // Provider returned failure — record and try next
      recordFailure(provider.name, country);
      reqLogger.warn(`Provider ${provider.name} returned failure: ${result.errorMessage}`);

    } catch (error: any) {
      const latency = (Date.now() - startTime) / 1000;
      smsSendLatency.observe({ provider: provider.name, country }, latency);
      recordFailure(provider.name, country);
      reqLogger.error(`Provider ${provider.name} threw error: ${error.message}`);
    }
  }

  // All providers failed for this attempt
  const totalAttempts = data.attempt + 1;
  if (totalAttempts >= MAX_PROVIDER_ATTEMPTS) {
    await db('messages').where('id', data.messageId).update({
      status: MessageStatus.DLQ,
      error_message: `Failed after ${totalAttempts} provider attempts`,
      attempts: totalAttempts,
      updated_at: new Date(),
    });
    smsRequestsTotal.inc({ tenant: data.tenantId, channel: data.channel, country, status: 'dlq' });
    reqLogger.error('Message sent to DLQ after exhausting all providers');
  } else {
    // Re-throw to trigger BullMQ retry with backoff
    throw new Error(`All providers failed on attempt ${totalAttempts}`);
  }
}

/**
 * Start workers for all priority lanes.
 */
export function startWorkers(): void {
  const connection = getRedis();

  for (const priority of Object.values(MessagePriority)) {
    const queueName = `sms-gw:${priority}`;
    const concurrency = priority === MessagePriority.OTP ? 10 : 5;

    const worker = new Worker(queueName, async (job) => {
      if (job.name === 'send-message') {
        await processSendMessage(job as Job<SendMessageJob>);
      }
    }, {
      connection,
      concurrency,
      limiter: {
        max: priority === MessagePriority.BULK ? 10 : 50,
        duration: 1000,
      },
    });

    worker.on('completed', (job) => {
      logger.debug(`Job completed: ${job.id} on ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job failed: ${job?.id} on ${queueName}`, { error: err.message });
    });

    logger.info(`Worker started for queue: ${queueName} (concurrency: ${concurrency})`);
  }
}
