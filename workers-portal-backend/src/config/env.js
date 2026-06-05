import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  ADMIN_SECRET: z.string().optional(),
  // SMTP — any provider (Gmail, SendGrid, Mailgun, etc.)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Smart Workers <noreply@smartworkers.in>'),
  // SMS — Fast2SMS (https://www.fast2sms.com)
  FAST2SMS_API_KEY: z.string().optional(),
  // Custom self-hosted SMS gateway (Android device running SMS Gateway app)
  CUSTOM_SMS_GATEWAY_URL: z.string().url().optional(),
  CUSTOM_SMS_GATEWAY_SECRET: z.string().optional(),
  // Firebase — required for customer phone OTP verification
  FIREBASE_PROJECT_ID: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedIssues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${formattedIssues}`);
}

const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  corsOrigins: parsedEnv.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  databaseUrl: parsedEnv.data.DATABASE_URL,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  encryptionKey: parsedEnv.data.ENCRYPTION_KEY,
  adminSecret: parsedEnv.data.ADMIN_SECRET ?? 'admin-dev-secret-change-me',
  smtpHost: parsedEnv.data.SMTP_HOST,
  smtpPort: parsedEnv.data.SMTP_PORT,
  smtpUser: parsedEnv.data.SMTP_USER,
  smtpPass: parsedEnv.data.SMTP_PASS,
  smtpFrom: parsedEnv.data.SMTP_FROM,
  fast2smsApiKey: parsedEnv.data.FAST2SMS_API_KEY,
  customSmsGatewayUrl: parsedEnv.data.CUSTOM_SMS_GATEWAY_URL,
  customSmsGatewaySecret: parsedEnv.data.CUSTOM_SMS_GATEWAY_SECRET,
  firebaseProjectId: parsedEnv.data.FIREBASE_PROJECT_ID,
};

export { env };