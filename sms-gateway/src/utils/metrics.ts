/**
 * Prometheus metrics collection for the SMS Gateway.
 * Exposes counters, histograms, and gauges per the monitoring strategy.
 */

import client from 'prom-client';
import { config } from '../config';

// Collect default Node.js metrics (GC, event loop, memory)
if (config.metrics.enabled) {
  client.collectDefaultMetrics({ prefix: 'sms_gateway_' });
}

// ─── SMS Metrics ─────────────────────────────────────────────────

export const smsRequestsTotal = new client.Counter({
  name: 'sms_requests_total',
  help: 'Total SMS requests by tenant, channel, country, and status',
  labelNames: ['tenant', 'channel', 'country', 'status'] as const,
});

export const smsSendLatency = new client.Histogram({
  name: 'sms_send_latency_seconds',
  help: 'SMS send latency by provider and country',
  labelNames: ['provider', 'country'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],
});

export const smsDeliveryRate = new client.Gauge({
  name: 'sms_delivery_rate',
  help: 'Rolling SMS delivery rate by provider and country',
  labelNames: ['provider', 'country'] as const,
});

export const smsCostTotal = new client.Counter({
  name: 'sms_cost_usd_total',
  help: 'Total SMS cost in USD by provider and country',
  labelNames: ['provider', 'country'] as const,
});

// ─── OTP Metrics ─────────────────────────────────────────────────

export const otpVerifyTotal = new client.Counter({
  name: 'otp_verify_total',
  help: 'Total OTP verification attempts by outcome',
  labelNames: ['outcome'] as const,
});

export const otpSendTotal = new client.Counter({
  name: 'otp_send_total',
  help: 'Total OTP send requests',
  labelNames: ['country', 'status'] as const,
});

// ─── Queue Metrics ───────────────────────────────────────────────

export const queueDepth = new client.Gauge({
  name: 'queue_depth',
  help: 'Current queue depth by lane',
  labelNames: ['lane'] as const,
});

export const dlqSize = new client.Gauge({
  name: 'dlq_size',
  help: 'Current dead letter queue size',
});

// ─── Circuit Breaker Metrics ─────────────────────────────────────

export const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half_open)',
  labelNames: ['provider'] as const,
});

// ─── Rate Limit Metrics ──────────────────────────────────────────

export const rateLimitHits = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total rate limit hits by dimension',
  labelNames: ['dimension', 'action'] as const,
});

export const metricsRegistry = client.register;
