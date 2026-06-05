/**
 * Verifies a Firebase ID token without the firebase-admin SDK.
 * Uses Firebase's published JWK public keys + jsonwebtoken for local verification.
 * Keys are cached for their TTL (usually ~1 hour).
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let _certs = null;
let _certsExpiry = 0;

async function getPublicCerts() {
  if (_certs && Date.now() < _certsExpiry) return _certs;

  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error('Failed to fetch Firebase public keys.');

  // Respect Cache-Control max-age
  const cc = res.headers.get('cache-control') ?? '';
  const maxAge = parseInt(cc.match(/max-age=(\d+)/)?.[1] ?? '3600', 10);
  _certs = await res.json();
  _certsExpiry = Date.now() + maxAge * 1000;
  return _certs;
}

/**
 * Verifies a Firebase ID token and returns { phoneNumber, uid }.
 * Throws if the token is invalid or doesn't contain a phone number.
 */
async function verifyFirebaseIdToken(idToken) {
  const projectId = env.firebaseProjectId;
  if (!projectId) {
    throw Object.assign(
      new Error('FIREBASE_PROJECT_ID is not configured on the server.'),
      { statusCode: 500 }
    );
  }

  // Decode header to get key ID
  const headerB64 = idToken.split('.')[0];
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  const certs = await getPublicCerts();
  const publicKey = certs[header.kid];

  if (!publicKey) {
    throw Object.assign(new Error('Invalid token: unknown key id.'), { statusCode: 401 });
  }

  let payload;
  try {
    payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });
  } catch (err) {
    throw Object.assign(
      new Error('Firebase token verification failed: ' + err.message),
      { statusCode: 401 }
    );
  }

  if (!payload.phone_number) {
    throw Object.assign(
      new Error('Token does not contain a phone number.'),
      { statusCode: 400 }
    );
  }

  return { phoneNumber: payload.phone_number, uid: payload.sub };
}

export { verifyFirebaseIdToken };
