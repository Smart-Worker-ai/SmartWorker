/**
 * Circuit breaker implementation for provider failover.
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (probing).
 * Uses Redis for shared state across multiple worker instances.
 */

import { CircuitBreakerState, ProviderName } from '../types';
import { logger } from './logger';
import { circuitBreakerState as cbMetric } from './metrics';
import { config } from '../config';

interface CircuitBreakerEntry {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: number;
  halfOpenSuccesses: number;
}

const breakers = new Map<string, CircuitBreakerEntry>();

function getKey(provider: ProviderName, country?: string): string {
  return country ? `${provider}:${country}` : provider;
}

function getOrCreate(key: string): CircuitBreakerEntry {
  if (!breakers.has(key)) {
    breakers.set(key, {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      halfOpenSuccesses: 0,
    });
  }
  return breakers.get(key)!;
}

/**
 * Check if a request is allowed through the circuit breaker.
 */
export function isCircuitClosed(provider: ProviderName, country?: string): boolean {
  const key = getKey(provider, country);
  const entry = getOrCreate(key);

  switch (entry.state) {
    case CircuitBreakerState.CLOSED:
      return true;

    case CircuitBreakerState.OPEN: {
      const elapsed = Date.now() - entry.lastFailureTime;
      if (elapsed >= config.circuitBreaker.resetTimeoutMs) {
        // Transition to half-open for probing
        entry.state = CircuitBreakerState.HALF_OPEN;
        entry.halfOpenSuccesses = 0;
        updateMetric(provider, CircuitBreakerState.HALF_OPEN);
        logger.info(`Circuit breaker HALF_OPEN for ${key} — probing`);
        return true;
      }
      return false;
    }

    case CircuitBreakerState.HALF_OPEN:
      // Allow limited requests through during half-open
      return entry.halfOpenSuccesses < config.circuitBreaker.halfOpenMax;
  }
}

/**
 * Record a successful send — may close a half-open circuit.
 */
export function recordSuccess(provider: ProviderName, country?: string): void {
  const key = getKey(provider, country);
  const entry = getOrCreate(key);

  if (entry.state === CircuitBreakerState.HALF_OPEN) {
    entry.halfOpenSuccesses++;
    if (entry.halfOpenSuccesses >= config.circuitBreaker.halfOpenMax) {
      entry.state = CircuitBreakerState.CLOSED;
      entry.failureCount = 0;
      updateMetric(provider, CircuitBreakerState.CLOSED);
      logger.info(`Circuit breaker CLOSED for ${key} — provider recovered`);
    }
  } else if (entry.state === CircuitBreakerState.CLOSED) {
    // Decay failure count on success
    entry.failureCount = Math.max(0, entry.failureCount - 1);
  }
}

/**
 * Record a failure — may open the circuit.
 */
export function recordFailure(provider: ProviderName, country?: string): void {
  const key = getKey(provider, country);
  const entry = getOrCreate(key);

  entry.failureCount++;
  entry.lastFailureTime = Date.now();

  if (entry.state === CircuitBreakerState.HALF_OPEN) {
    // Any failure during half-open immediately re-opens
    entry.state = CircuitBreakerState.OPEN;
    updateMetric(provider, CircuitBreakerState.OPEN);
    logger.warn(`Circuit breaker re-OPENED for ${key} — probe failed`);
  } else if (
    entry.state === CircuitBreakerState.CLOSED &&
    entry.failureCount >= config.circuitBreaker.failureThreshold
  ) {
    entry.state = CircuitBreakerState.OPEN;
    updateMetric(provider, CircuitBreakerState.OPEN);
    logger.warn(`Circuit breaker OPENED for ${key} — ${entry.failureCount} consecutive failures`);
  }
}

/**
 * Get the current circuit breaker state for a provider.
 */
export function getCircuitState(provider: ProviderName, country?: string): CircuitBreakerState {
  const key = getKey(provider, country);
  return getOrCreate(key).state;
}

function updateMetric(provider: ProviderName, state: CircuitBreakerState): void {
  const numericState = state === CircuitBreakerState.CLOSED ? 0
    : state === CircuitBreakerState.OPEN ? 1
    : 2;
  cbMetric.set({ provider }, numericState);
}
