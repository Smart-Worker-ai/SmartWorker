/**
 * Core type definitions for the SMS Gateway system.
 * All domain types are defined here to maintain a single source of truth.
 */

// ─── Message Types ───────────────────────────────────────────────

export enum MessageChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  VOICE = 'voice',
  EMAIL = 'email',
}

export enum MessagePriority {
  OTP = 'otp',
  TRANSACTIONAL = 'transactional',
  NOTIFICATION = 'notification',
  BULK = 'bulk',
}

export enum MessageStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  DLQ = 'dlq',
  EXPIRED = 'expired',
  UNKNOWN = 'unknown',
}

export enum OtpStatus {
  PENDING = 'pending',
  SENT = 'sent',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  MAX_ATTEMPTS = 'max_attempts',
  FAILED = 'failed',
}

// ─── Provider Types ──────────────────────────────────────────────

export enum ProviderName {
  TWILIO = 'twilio',
  PLIVO = 'plivo',
  MSG91 = 'msg91',
  TEXTLOCAL = 'textlocal',
  FAST2SMS = 'fast2sms',
  MOCK = 'mock',
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface ProviderHealthScore {
  provider: ProviderName;
  country: string;
  deliveryRate: number;
  p95Latency: number;
  errorRate: number;
  score: number;
  circuitState: CircuitBreakerState;
  lastUpdated: Date;
}

export interface ProviderConfig {
  name: ProviderName;
  enabled: boolean;
  priority: number;
  supportedCountries: string[];
  costPerMessage: Record<string, number>;
  tpsLimit: number;
  credentials: Record<string, string>;
}

// ─── Message Payloads ────────────────────────────────────────────

export interface SendMessageRequest {
  to: string;
  body: string;
  channel?: MessageChannel;
  priority?: MessagePriority;
  idempotencyKey: string;
  tenantId?: string;
  metadata?: Record<string, string>;
}

export interface SendOtpRequest {
  phone: string;
  tenantId?: string;
  ipAddress: string;
  userAgent?: string;
  userId?: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
  tenantId?: string;
  ipAddress: string;
}

export interface MessageRecord {
  id: string;
  idempotencyKey: string;
  to: string;
  toHash: string;
  body: string;
  channel: MessageChannel;
  priority: MessagePriority;
  status: MessageStatus;
  tenantId: string;
  providerName?: ProviderName;
  providerMessageId?: string;
  attempts: number;
  excludedProviders: ProviderName[];
  metadata?: Record<string, string>;
  errorMessage?: string;
  costUsd?: number;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
}

export interface OtpRecord {
  id: string;
  phoneHash: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  channel: MessageChannel;
  status: OtpStatus;
  messageId?: string;
  ipAddress: string;
  userAgent?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
}

// ─── Queue Job Types ─────────────────────────────────────────────

export interface SendMessageJob {
  messageId: string;
  to: string;
  body: string;
  channel: MessageChannel;
  priority: MessagePriority;
  attempt: number;
  excludedProviders: ProviderName[];
  idempotencyKey: string;
  tenantId: string;
}

export interface DlrCheckJob {
  messageId: string;
  providerName: ProviderName;
  providerMessageId: string;
  sentAt: string;
  timeoutMs: number;
}

// ─── Provider Interface ─────────────────────────────────────────

export interface ProviderSendResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  costUsd?: number;
}

export interface ISmsProvider {
  name: ProviderName;
  send(to: string, body: string): Promise<ProviderSendResult>;
  getBalance?(): Promise<number>;
  verifyWebhookSignature?(payload: unknown, signature: string): boolean;
}

// ─── API Response Types ──────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  requestId: string;
}

export interface SendOtpResponse {
  otpId: string;
  expiresAt: string;
  resendCooldownSeconds: number;
}

export interface VerifyOtpResponse {
  verified: boolean;
  remainingAttempts?: number;
}

export interface MessageStatusResponse {
  messageId: string;
  status: MessageStatus;
  provider?: ProviderName;
  sentAt?: string;
  deliveredAt?: string;
}

// ─── Webhook Types ──────────────────────────────────────────────

export interface DeliveryReceipt {
  providerName: ProviderName;
  providerMessageId: string;
  status: 'sent' | 'delivered' | 'failed' | 'undelivered';
  errorCode?: string;
  timestamp: Date;
  rawPayload: unknown;
}

// ─── Audit Types ─────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  ipAddress: string;
  userAgent?: string;
  resourceType: string;
  resourceId: string;
  outcome: 'success' | 'failure';
  details?: Record<string, unknown>;
  createdAt: Date;
}
