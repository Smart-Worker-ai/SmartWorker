/**
 * Structured JSON logger with correlation ID support.
 * PII fields are automatically redacted in production.
 */

import winston from 'winston';
import { config } from '../config';

const PII_PATTERNS = [
  { regex: /(\+?\d{1,4}[\s-]?\(?\d{1,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4})/g, replacement: '[REDACTED_PHONE]' },
  { regex: /\b\d{4,8}\b(?=.*otp)/gi, replacement: '[REDACTED_OTP]' },
];

const piiRedactionFormat = winston.format((info) => {
  if (config.isProduction && typeof info.message === 'string') {
    let msg = info.message as string;
    for (const pattern of PII_PATTERNS) {
      msg = msg.replace(pattern.regex, pattern.replacement);
    }
    info.message = msg;
  }
  return info;
});

const logFormat = config.logging.format === 'pretty'
  ? winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      piiRedactionFormat(),
      winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
        const cid = correlationId ? ` [${correlationId}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}${cid}: ${message}${metaStr}`;
      })
    )
  : winston.format.combine(
      winston.format.timestamp(),
      piiRedactionFormat(),
      winston.format.json()
    );

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'sms-gateway' },
  transports: [
    new winston.transports.Console(),
  ],
  // Don't exit on uncaught exceptions — let the process manager handle restarts
  exitOnError: false,
});

/**
 * Create a child logger with a bound correlation ID.
 * Use this for per-request logging to trace operations end-to-end.
 */
export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}
