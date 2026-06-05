import crypto from 'node:crypto';

const algorithm = 'aes-256-gcm';

function getKey() {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret || secret.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set to at least 32 characters');
  }

  return crypto.createHash('sha256').update(secret).digest();
}

function encryptText(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

function decryptText(payload) {
  const [ivValue, authTagValue, encryptedValue] = String(payload).split(':');

  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error('Invalid encrypted payload');
  }

  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

export { encryptText, decryptText };
