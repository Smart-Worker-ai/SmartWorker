/**
 * Mock SMS provider for development and testing.
 * Logs messages instead of sending them. Simulates realistic latency and occasional failures.
 */

import { ISmsProvider, ProviderName, ProviderSendResult } from '../types';
import { logger } from '../utils/logger';
import { generateId } from '../utils/crypto';

export class MockProvider implements ISmsProvider {
  readonly name = ProviderName.MOCK;

  private sendCount = 0;
  private readonly failureRate: number;

  constructor(failureRate: number = 0.05) {
    this.failureRate = failureRate;
  }

  async send(to: string, body: string): Promise<ProviderSendResult> {
    this.sendCount++;

    // Simulate network latency (50–300ms)
    const latency = 50 + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, latency));

    // Simulate occasional failures
    if (Math.random() < this.failureRate) {
      logger.debug(`[MOCK] Simulated failure for send #${this.sendCount}`);
      return {
        success: false,
        errorCode: 'MOCK_FAILURE',
        errorMessage: 'Simulated provider failure for testing',
      };
    }

    const messageId = `mock_${generateId()}`;
    logger.info(`[MOCK] SMS sent successfully`, {
      to: to.substring(0, 4) + '****',
      messageId,
      bodyLength: body.length,
      latencyMs: Math.round(latency),
    });

    return {
      success: true,
      providerMessageId: messageId,
      costUsd: 0,
    };
  }

  async getBalance(): Promise<number> {
    return 999999;
  }
}
