/**
 * Basic tests for crypto utilities and phone validation.
 * Environment must be set before any module imports.
 */

// Set required env vars BEFORE imports
process.env.HMAC_SECRET = 'test-hmac-secret-that-is-at-least-32-characters-long';
process.env.OTP_PEPPER = 'test-otp-pepper-at-least-16-chars';
process.env.DB_PASSWORD = 'test-password';
process.env.NODE_ENV = 'test';

import { generateOtp, hashOtp, verifyOtp, hashPhone, generateHmacSignature, verifyHmacSignature, generateNonce } from '../src/utils/crypto';

describe('Crypto Utilities', () => {
  test('generateOtp produces correct length', () => {
    const otp = generateOtp(6);
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  test('generateOtp produces different values', () => {
    const otps = new Set(Array.from({ length: 10 }, () => generateOtp(6)));
    expect(otps.size).toBeGreaterThan(1);
  });

  test('hashOtp and verifyOtp round-trip', async () => {
    const otp = '123456';
    const hash = await hashOtp(otp);
    expect(hash).not.toBe(otp);
    expect(await verifyOtp(otp, hash)).toBe(true);
    expect(await verifyOtp('654321', hash)).toBe(false);
  });

  test('hashPhone is deterministic', () => {
    const phone = '+919876543210';
    const hash1 = hashPhone(phone);
    const hash2 = hashPhone(phone);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(phone);
  });

  test('HMAC signature verification', () => {
    const payload = '{"phone":"+919876543210"}';
    const timestamp = Date.now().toString();
    const nonce = generateNonce();

    const sig = generateHmacSignature(payload, timestamp, nonce);
    expect(verifyHmacSignature(payload, timestamp, nonce, sig)).toBe(true);
    expect(verifyHmacSignature(payload + 'x', timestamp, nonce, sig)).toBe(false);
  });
});
