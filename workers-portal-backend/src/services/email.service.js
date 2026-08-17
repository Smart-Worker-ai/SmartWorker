import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// ── SMTP Email ────────────────────────────────────────────────────────────────

let _transporter = null;

function _getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
  }
  return _transporter;
}

async function _sendEmail({ to, subject, html }) {
  if (!env.smtpHost || !env.smtpUser) {
    console.info(`[email] SMTP not configured — skipping mail to ${to} | ${subject}`);
    return false;
  }
  try {
    await _getTransporter().sendMail({ from: env.smtpFrom, to, subject, html });
    return true;
  } catch (err) {
    console.error('[email] Send failed:', err.message);
    return false;
  }
}

// ── SMS via Fast2SMS ──────────────────────────────────────────────────────────

function _normalizePhone(phone) {
  // Keep last 10 digits of an Indian number
  return String(phone).replace(/\D/g, '').slice(-10);
}

// ── Custom self-hosted Android SMS Gateway ────────────────────────────────────
// Install "SMS Gateway for Android" on any spare phone → set CUSTOM_SMS_GATEWAY_URL
// It exposes POST /message with { phone_number, message }
async function _sendViaCustomGateway(phone, message) {
  if (!env.customSmsGatewayUrl) return false;
  try {
    const digits = _normalizePhone(phone);
    if (digits.length !== 10) return false;
    const headers = { 'Content-Type': 'application/json' };
    if (env.customSmsGatewaySecret) headers['Authorization'] = `Bearer ${env.customSmsGatewaySecret}`;
    const res = await fetch(env.customSmsGatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone_number: `+91${digits}`, message }),
    });
    if (!res.ok) console.warn('[sms] Custom gateway error:', res.status);
    return res.ok;
  } catch (err) {
    console.error('[sms] Custom gateway failed:', err.message);
    return false;
  }
}

async function _sendSms(phone, message) {
  if (!env.fast2smsApiKey) {
    console.info(`[sms] Fast2SMS not configured — skipping SMS to ${phone}`);
    return false;
  }
  try {
    const digits = _normalizePhone(phone);
    if (digits.length !== 10) return false;
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        Authorization: env.fast2smsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: digits,
      }),
    });
    const data = await res.json();
    if (!data.return) console.warn('[sms] Fast2SMS error:', data.message);
    return !!data.return;
  } catch (err) {
    console.error('[sms] Send failed:', err.message);
    return false;
  }
}

async function _sendOtpSms(phone, otp) {
  const message = `Your HAYAKU OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`;

  // 1. Try custom self-hosted gateway first (free, no third-party)
  if (await _sendViaCustomGateway(phone, message)) return true;

  // 2. Fallback: Fast2SMS
  if (!env.fast2smsApiKey) {
    console.info(`[sms] No SMS provider configured — skipping OTP SMS to ${phone}`);
    return false;
  }
  try {
    const digits = _normalizePhone(phone);
    if (digits.length !== 10) return false;
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        Authorization: env.fast2smsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: digits,
      }),
    });
    const data = await res.json();
    if (!data.return) console.warn('[sms] Fast2SMS error:', data.message);
    return !!data.return;
  } catch (err) {
    console.error('[sms] OTP SMS failed:', err.message);
    return false;
  }
}

// ── Shared table builder ──────────────────────────────────────────────────────

function _row(label, value, alt) {
  return `<tr style="${alt ? 'background:#f9fafb' : ''}">
    <td style="padding:8px 14px;color:#6b7280;font-size:13px;white-space:nowrap">${label}</td>
    <td style="padding:8px 14px;font-weight:600;color:#111827">${value}</td>
  </tr>`;
}

function _table(rows) {
  return `<table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
    ${rows.map(([l, v], i) => _row(l, v, i % 2)).join('')}
  </table>`;
}

// ── OTP ───────────────────────────────────────────────────────────────────────

async function sendOtpEmail(email, otp) {
  return _sendEmail({
    to: email,
    subject: 'HAYAKU — Your OTP',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#4338ca;margin:0 0 12px">HAYAKU</h2>
      <p style="color:#374151;margin:0 0 8px">Your one-time password:</p>
      <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#1e1b4b;background:#eef2ff;border-radius:16px;text-align:center;padding:28px 0;margin:20px 0">${otp}</div>
      <p style="color:#9ca3af;font-size:13px;margin:0">Valid for <b>10 minutes</b>. Never share this code with anyone.</p>
    </div>`,
  });
}

async function sendOtpSms(phone, otp) {
  return _sendOtpSms(phone, otp);
}

// ── Booking Confirmation ──────────────────────────────────────────────────────

async function sendBookingConfirmation(customerEmail, customerPhone, booking, workerName) {
  const dateStr = new Date(booking.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const rows = [
    ['Worker', workerName],
    ['Service', booking.job_type],
    ['Date', dateStr],
    ['Duration', `${booking.number_of_days} day(s)`],
    ['Total', `₹${booking.total_price}`],
    ['Address', booking.address || '—'],
  ];

  if (customerEmail) {
    _sendEmail({
      to: customerEmail,
      subject: `Booking Confirmed — ${workerName}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <h2 style="color:#4338ca;margin:0 0 4px">HAYAKU</h2>
        <h3 style="color:#065f46;margin:0 0 20px">✅ Booking Confirmed!</h3>
        ${_table(rows)}
        <p style="color:#9ca3af;font-size:13px;margin-top:20px">Thank you for choosing HAYAKU!</p>
      </div>`,
    }).catch(() => {});
  }

  if (customerPhone) {
    _sendSms(customerPhone,
      `HAYAKU: Booking confirmed! ${workerName} (${booking.job_type}) on ${dateStr}. Total: Rs.${booking.total_price}. Address: ${booking.address || 'provided'}`
    ).catch(() => {});
  }
}

// ── Worker Booking Alert ──────────────────────────────────────────────────────

async function sendWorkerBookingAlert(workerEmail, workerPhone, workerName, booking, customerName) {
  const dateStr = new Date(booking.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const rows = [
    ['Customer', customerName],
    ['Service', booking.job_type],
    ['Date', dateStr],
    ['Duration', `${booking.number_of_days} day(s)`],
    ['Amount', `₹${booking.total_price}`],
    ['Address', booking.address || '—'],
  ];

  if (workerEmail) {
    _sendEmail({
      to: workerEmail,
      subject: `New Booking from ${customerName}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <h2 style="color:#4338ca;margin:0 0 4px">HAYAKU</h2>
        <h3 style="color:#1d4ed8;margin:0 0 20px">📋 New Service Booking!</h3>
        <p style="color:#374151;margin:0 0 16px">Hello <b>${workerName}</b>, you have a new booking:</p>
        ${_table(rows)}
        <p style="color:#9ca3af;font-size:13px;margin-top:20px">Please ensure you are available on the booked date.</p>
      </div>`,
    }).catch(() => {});
  }

  if (workerPhone) {
    _sendSms(workerPhone,
      `HAYAKU: New booking! ${customerName} booked you for ${booking.job_type} on ${dateStr}. Address: ${booking.address || 'to be shared'}. Amount: Rs.${booking.total_price}`
    ).catch(() => {});
  }
}

export { sendOtpEmail, sendOtpSms, sendBookingConfirmation, sendWorkerBookingAlert };
