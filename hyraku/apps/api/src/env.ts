// Configuration, asserted at boot.
//
// Every value is required. There are no development fallbacks: a default
// admin password or a silently-absent app secret is not a convenience, it is
// the shape production incidents take. The process refuses to start rather
// than run degraded.

function required(name: string, minLength = 1): string {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(
      minLength > 1
        ? `${name} is required and must be at least ${minLength} characters`
        : `${name} is required`
    );
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),

  /** Where the public site and the WhatsApp deep links point. */
  publicUrl: required('PUBLIC_URL'),

  /** Signs field-user sessions. */
  sessionSecret: required('SESSION_SECRET', 32),

  /** AES-256-GCM key for documents at rest, base64. Aadhaar and PVC images. */
  documentKey: required('DOCUMENT_ENCRYPTION_KEY', 44),

  // INTERIM, until apps/admin owns authentication against AdminUser. No
  // default and a length floor, so at least it cannot ship as "hyraku".
  adminPassword: required('ADMIN_PASSWORD', 16),

  whatsapp: {
    phoneNumberId: required('WHATSAPP_PHONE_NUMBER_ID'),
    accessToken: required('WHATSAPP_ACCESS_TOKEN'),
    // Without this the webhook cannot tell Meta from anyone who found the URL.
    appSecret: required('WHATSAPP_APP_SECRET'),
    verifyToken: required('WHATSAPP_VERIFY_TOKEN'),
    apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v21.0',
  },

  // Workers whose number is not on WhatsApp are reached here instead. Not
  // optional: registration is phone-first, so this is a delivery path for real
  // people rather than a fallback.
  sms: {
    authKey: required('MSG91_AUTH_KEY'),
    senderId: required('MSG91_SENDER_ID'),
    dltTemplateId: required('MSG91_DLT_TEMPLATE_ID'),
  },
};

/**
 * Dates are agreed in Kerala, so the process must think in Kerala time. A UTC
 * host silently resolves "today" to yesterday between midnight and 05:30 IST,
 * and the booking flow then rejects it as a date in the past.
 */
export function assertTimezone(): void {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (zone !== 'Asia/Kolkata') {
    throw new Error(`TZ must be Asia/Kolkata, found ${zone}`);
  }
}
