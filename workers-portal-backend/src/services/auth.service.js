import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getDb } from '../config/database.js';
import { sendOtpEmail, sendOtpSms } from './email.service.js';

const JWT_SECRET = env.jwtSecret ?? 'dev-fallback-secret-must-be-32-chars!!';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(hash));
}

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function safeCustomer(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return { ...safe, profileComplete: !!row.profile_complete, isBlocked: !!row.is_blocked };
}

// ── Email OTP Auth ────────────────────────────────────────────────────────────

async function sendEmailOtp(email, phone) {
  const key = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
    throw Object.assign(new Error('Enter a valid email address.'), { statusCode: 400 });
  }

  const db = getDb();
  db.prepare('DELETE FROM email_otps WHERE email = ?').run(key);

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000;
  db.prepare('INSERT INTO email_otps (id, email, otp, expires_at) VALUES (?, ?, ?, ?)')
    .run(crypto.randomUUID(), key, otp, expiresAt);

  await sendOtpEmail(key, otp);
  // Send SMS to provided phone, or to the phone on file for existing users
  const phoneToUse = phone || db.prepare('SELECT phone FROM customers WHERE email = ?').get(key)?.phone;
  if (phoneToUse) sendOtpSms(phoneToUse, otp).catch(() => {});

  return {
    message: 'OTP sent to your email address.',
    // Only expose OTP in non-production for developer testing
    devOtp: env.nodeEnv !== 'production' ? otp : undefined,
  };
}

async function verifyEmailOtp(email, otp) {
  const key = email.toLowerCase().trim();
  const db = getDb();

  const record = db.prepare('SELECT * FROM email_otps WHERE email = ?').get(key);
  if (!record) {
    throw Object.assign(new Error('No OTP found for this email. Please request a new one.'), { statusCode: 404 });
  }
  if (Date.now() > record.expires_at) {
    db.prepare('DELETE FROM email_otps WHERE email = ?').run(key);
    throw Object.assign(new Error('OTP has expired. Please request a new one.'), { statusCode: 410 });
  }
  if (record.otp !== String(otp).trim()) {
    throw Object.assign(new Error('Invalid OTP. Please try again.'), { statusCode: 401 });
  }

  // Consume the OTP
  db.prepare('DELETE FROM email_otps WHERE email = ?').run(key);

  // Find or create customer
  let customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(key);
  const isNewUser = !customer;

  if (isNewUser) {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO customers (id, email, profile_complete) VALUES (?, ?, 0)').run(id, key);
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  }

  if (customer.is_blocked) {
    throw Object.assign(new Error('Your account has been blocked. Contact support.'), { statusCode: 403 });
  }

  const token = makeToken({ userId: customer.id, email: key });
  return { token, user: safeCustomer(customer), isNewUser };
}

// ── Email / Password Auth ─────────────────────────────────────────────────────

async function registerWithEmail(email, password, name) {
  const db = getDb();
  const key = email.toLowerCase().trim();

  if (db.prepare('SELECT id FROM email_accounts WHERE email = ?').get(key)) {
    throw Object.assign(new Error('An account with this email already exists.'), { statusCode: 409 });
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  db.prepare('INSERT INTO email_accounts (id, email, name, password_hash) VALUES (?, ?, ?, ?)')
    .run(id, key, name.trim(), passwordHash);

  db.prepare('INSERT OR IGNORE INTO customers (id, email, name, profile_complete) VALUES (?, ?, ?, 1)')
    .run(id, key, name.trim());

  const user = { id, email: key, name: name.trim(), profileComplete: true };
  const token = makeToken({ userId: id, email: key });
  return { token, user, isNewUser: true };
}

async function loginWithEmail(email, password) {
  const db = getDb();
  const key = email.toLowerCase().trim();
  const now = Date.now();

  let att = db.prepare('SELECT * FROM login_attempts WHERE email = ?').get(key);
  if (att && now < att.reset_at && att.count >= 5) {
    throw Object.assign(new Error('Too many failed attempts. Try again in 15 minutes.'), { statusCode: 429 });
  }
  if (!att || now >= att.reset_at) {
    db.prepare('INSERT OR REPLACE INTO login_attempts (email, count, reset_at) VALUES (?, 0, ?)')
      .run(key, now + 15 * 60 * 1000);
    att = { count: 0 };
  }

  const account = db.prepare('SELECT * FROM email_accounts WHERE email = ?').get(key);
  if (!account || !verifyPassword(password, account.password_hash)) {
    const newCount = (att.count ?? 0) + 1;
    db.prepare('UPDATE login_attempts SET count = ? WHERE email = ?').run(newCount, key);
    const remaining = 5 - newCount;
    throw Object.assign(
      new Error(remaining > 0
        ? `Invalid email or password. ${remaining} attempt(s) remaining.`
        : 'Too many failed attempts. Try again in 15 minutes.'),
      { statusCode: 401 }
    );
  }

  if (account.is_blocked) {
    throw Object.assign(new Error('Your account has been blocked. Contact support.'), { statusCode: 403 });
  }

  db.prepare('DELETE FROM login_attempts WHERE email = ?').run(key);

  const customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(key);
  if (!customer) {
    db.prepare('INSERT OR IGNORE INTO customers (id, email, name, profile_complete) VALUES (?, ?, ?, 1)')
      .run(account.id, account.email, account.name);
  }

  const safeUser = {
    id: account.id,
    email: account.email,
    name: account.name,
    avatarColorIndex: account.avatar_color_index,
    profileComplete: true,
  };

  const token = makeToken({ userId: account.id, email: account.email });
  return { token, user: safeUser, isNewUser: false };
}

// ── Profile ───────────────────────────────────────────────────────────────────

async function completeProfile(userId, data) {
  const db = getDb();
  const { name, avatarColorIndex, phone } = data;

  db.prepare(`
    UPDATE customers
    SET name = COALESCE(?, name),
        avatar_color_index = COALESCE(?, avatar_color_index),
        phone = COALESCE(?, phone),
        profile_complete = 1
    WHERE id = ?
  `).run(name ?? null, avatarColorIndex ?? null, phone ?? null, userId);

  if (name) {
    db.prepare('UPDATE email_accounts SET name = ?, avatar_color_index = COALESCE(?, avatar_color_index) WHERE id = ?')
      .run(name, avatarColorIndex ?? null, userId);
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(userId);
  if (!customer) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return safeCustomer(customer);
}

async function getUserById(userId) {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(userId);
  return safeCustomer(customer);
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export {
  sendEmailOtp,
  verifyEmailOtp,
  registerWithEmail,
  loginWithEmail,
  completeProfile,
  getUserById,
  verifyToken,
};
