/**
 * Cryptographic utilities for OTP generation, hashing, and HMAC operations.
 * Uses CSPRNG for all random values. Never stores OTPs in plaintext.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config';

const BCRYPT_ROUNDS = 10;

/**
 * Generate a cryptographically secure random numeric OTP.
 * Uses rejection sampling to avoid modulo bias.
 */
export function generateOtp(length: number = config.otp.length): string {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  let otp: number;

  do {
    const bytes = crypto.randomBytes(4);
    otp = bytes.readUInt32BE(0) % max;
  } while (otp < min);

  return otp.toString();
}

/**
 * Hash an OTP using bcrypt for storage.
 * Pepper is applied before hashing for defense-in-depth.
 */
export async function hashOtp(otp: string): Promise<string> {
  const peppered = `${otp}:${config.otp.pepper}`;
  return bcrypt.hash(peppered, BCRYPT_ROUNDS);
}

/**
 * Verify an OTP against its bcrypt hash (constant-time comparison).
 */
export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  const peppered = `${otp}:${config.otp.pepper}`;
  return bcrypt.compare(peppered, hash);
}

/**
 * Hash a phone number using HMAC-SHA256 for storage lookups.
 * This allows indexed lookups without storing plaintext phones.
 */
export function hashPhone(phone: string): string {
  return crypto
    .createHmac('sha256', config.otp.pepper)
    .update(phone)
    .digest('hex');
}

/**
 * Generate an HMAC-SHA256 signature for request authentication.
 */
export function generateHmacSignature(payload: string, timestamp: string, nonce: string): string {
  const data = `${timestamp}:${nonce}:${payload}`;
  return crypto
    .createHmac('sha256', config.auth.hmacSecret)
    .update(data)
    .digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature with timing-safe comparison.
 */
export function verifyHmacSignature(
  payload: string,
  timestamp: string,
  nonce: string,
  signature: string
): boolean {
  const expected = generateHmacSignature(payload, timestamp, nonce);
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');

  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * Generate a cryptographically secure nonce.
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a UUID v4 for correlation IDs and record IDs.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
