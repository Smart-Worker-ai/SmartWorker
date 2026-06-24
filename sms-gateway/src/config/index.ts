/**
 * Centralized configuration management.
 * All environment variables are validated at startup via Zod schemas.
 * The application will refuse to start with invalid or missing critical config.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3100),
  API_BASE_URL: z.string().default('http://localhost:3100'),

  // HMAC Authentication
  HMAC_SECRET: z.string().min(32, 'HMAC secret must be at least 32 characters'),

  // PostgreSQL
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('sms_gateway'),
  DB_USER: z.string().default('sms_gateway_user'),
  DB_PASSWORD: z.string(),
  DB_SSL: z.coerce.boolean().default(false),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(10),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_TLS: z.coerce.boolean().default(false),

  // OTP Configuration
  OTP_LENGTH: z.coerce.number().min(4).max(8).default(6),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(30),
  OTP_MAX_PER_PHONE_PER_DAY: z.coerce.number().default(5),
  OTP_MAX_PER_IP_PER_DAY: z.coerce.number().default(10),
  OTP_PEPPER: z.string().min(16, 'OTP pepper must be at least 16 characters'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Providers (optional — at least one must be configured for production)
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_FROM_NUMBER: z.string().optional().default(''),

  PLIVO_AUTH_ID: z.string().optional().default(''),
  PLIVO_AUTH_TOKEN: z.string().optional().default(''),
  PLIVO_FROM_NUMBER: z.string().optional().default(''),

  MSG91_AUTH_KEY: z.string().optional().default(''),
  MSG91_SENDER_ID: z.string().optional().default(''),
  MSG91_DLT_TEMPLATE_ID: z.string().optional().default(''),

  TEXTLOCAL_API_KEY: z.string().optional().default(''),
  TEXTLOCAL_SENDER: z.string().optional().default(''),

  FAST2SMS_API_KEY: z.string().optional().default(''),
  FAST2SMS_SENDER_ID: z.string().optional().default(''),

  // Webhook
  WEBHOOK_VERIFY_SIGNATURES: z.coerce.boolean().default(true),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Metrics
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().default(9090),

  // Country Allow List
  ALLOWED_COUNTRIES: z.string().default('IN,US,GB,CA,AU'),

  // Circuit Breaker
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().default(30000),
  CIRCUIT_BREAKER_HALF_OPEN_MAX: z.coerce.number().default(3),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(formatted, null, 2));
    process.exit(1);
  }

  const env = result.data;

  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',

    server: {
      port: env.PORT,
      baseUrl: env.API_BASE_URL,
    },

    auth: {
      hmacSecret: env.HMAC_SECRET,
    },

    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: env.DB_SSL,
      pool: {
        min: env.DB_POOL_MIN,
        max: env.DB_POOL_MAX,
      },
    },

    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB,
      tls: env.REDIS_TLS,
    },

    otp: {
      length: env.OTP_LENGTH,
      expirySeconds: env.OTP_EXPIRY_SECONDS,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      maxPerPhonePerDay: env.OTP_MAX_PER_PHONE_PER_DAY,
      maxPerIpPerDay: env.OTP_MAX_PER_IP_PER_DAY,
      pepper: env.OTP_PEPPER,
    },

    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },

    providers: {
      twilio: {
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        fromNumber: env.TWILIO_FROM_NUMBER,
        enabled: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
      },
      plivo: {
        authId: env.PLIVO_AUTH_ID,
        authToken: env.PLIVO_AUTH_TOKEN,
        fromNumber: env.PLIVO_FROM_NUMBER,
        enabled: !!(env.PLIVO_AUTH_ID && env.PLIVO_AUTH_TOKEN),
      },
      msg91: {
        authKey: env.MSG91_AUTH_KEY,
        senderId: env.MSG91_SENDER_ID,
        dltTemplateId: env.MSG91_DLT_TEMPLATE_ID,
        enabled: !!env.MSG91_AUTH_KEY,
      },
      textlocal: {
        apiKey: env.TEXTLOCAL_API_KEY,
        sender: env.TEXTLOCAL_SENDER,
        enabled: !!env.TEXTLOCAL_API_KEY,
      },
      fast2sms: {
        apiKey: env.FAST2SMS_API_KEY,
        senderId: env.FAST2SMS_SENDER_ID,
        enabled: !!env.FAST2SMS_API_KEY,
      },
    },

    webhook: {
      verifySignatures: env.WEBHOOK_VERIFY_SIGNATURES,
    },

    logging: {
      level: env.LOG_LEVEL,
      format: env.LOG_FORMAT,
    },

    metrics: {
      enabled: env.METRICS_ENABLED,
      port: env.METRICS_PORT,
    },

    security: {
      allowedCountries: env.ALLOWED_COUNTRIES.split(',').map((c: string) => c.trim().toUpperCase()),
    },

    circuitBreaker: {
      failureThreshold: env.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      resetTimeoutMs: env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
      halfOpenMax: env.CIRCUIT_BREAKER_HALF_OPEN_MAX,
    },
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
export const config = loadConfig();
