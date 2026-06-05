import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  sendEmailOtp,
  verifyEmailOtp,
  registerWithEmail,
  loginWithEmail,
  completeProfile,
} from '../services/auth.service.js';
import { verifyFirebaseIdToken } from '../services/firebase-verify.service.js';
import { getDb } from '../config/database.js';
import { env } from '../config/env.js';

// ── Email OTP Auth ────────────────────────────────────────────────────────────

async function postSendOtp(request, response) {
  const { email, phone } = request.body;
  if (!email) {
    return response.status(400).json({ error: 'email is required.' });
  }
  try {
    const result = await sendEmailOtp(String(email).trim(), phone ? String(phone).trim() : undefined);
    response.json(result);
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

async function postVerifyOtp(request, response) {
  const { email, otp } = request.body;
  if (!email || !otp) {
    return response.status(400).json({ error: 'email and otp are required.' });
  }
  try {
    const result = await verifyEmailOtp(String(email).trim(), String(otp).trim());
    response.json(result);
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

// ── Email / Password Auth ─────────────────────────────────────────────────────

async function postRegisterEmail(request, response) {
  const { email, password, name } = request.body;
  if (!email || !password || !name) {
    return response.status(400).json({ error: 'email, password and name are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ error: 'Enter a valid email address.' });
  }
  const pwd = String(password);
  if (pwd.length < 8) return response.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!/[A-Z]/.test(pwd)) return response.status(400).json({ error: 'Password must contain at least one uppercase letter.' });
  if (!/[0-9]/.test(pwd)) return response.status(400).json({ error: 'Password must contain at least one number.' });
  if (!/[^A-Za-z0-9]/.test(pwd)) return response.status(400).json({ error: 'Password must contain at least one special character.' });
  try {
    const result = await registerWithEmail(String(email).trim(), String(password), String(name).trim());
    response.status(201).json(result);
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

async function postLoginEmail(request, response) {
  const { email, password } = request.body;
  if (!email || !password) {
    return response.status(400).json({ error: 'email and password are required.' });
  }
  try {
    const result = await loginWithEmail(String(email).trim(), String(password));
    response.json(result);
  } catch (err) {
    response.status(err.statusCode ?? 400).json({ error: err.message });
  }
}

async function postCompleteProfile(request, response) {
  try {
    const user = await completeProfile(request.user.userId, request.body);
    response.json({ user });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

// ── Firebase Phone OTP Auth ───────────────────────────────────────────────────

async function postVerifyFirebasePhone(request, response) {
  const { idToken } = request.body;
  if (!idToken) {
    return response.status(400).json({ error: 'idToken is required.' });
  }
  try {
    const { phoneNumber } = await verifyFirebaseIdToken(String(idToken));

    const db = getDb();
    const JWT_SECRET = env.jwtSecret ?? 'dev-fallback-secret-must-be-32-chars!!';

    let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phoneNumber);
    const isNewUser = !customer;

    if (isNewUser) {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO customers (id, phone, profile_complete) VALUES (?, ?, 0)')
        .run(id, phoneNumber);
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    }

    if (customer.is_blocked) {
      return response.status(403).json({ error: 'Your account has been blocked. Contact support.' });
    }

    const token = jwt.sign({ userId: customer.id, phone: phoneNumber }, JWT_SECRET, { expiresIn: '30d' });
    const { password_hash, ...safe } = customer;
    const user = { ...safe, profileComplete: !!customer.profile_complete, isBlocked: !!customer.is_blocked };

    response.json({ token, user, isNewUser });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

export { postSendOtp, postVerifyOtp, postRegisterEmail, postLoginEmail, postCompleteProfile, postVerifyFirebasePhone };
