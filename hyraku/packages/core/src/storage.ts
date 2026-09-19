// Document storage.
//
// These are Aadhaar cards, police verification certificates and face photos.
// Three properties follow from that and none of them are optional:
//
//  1. Bytes are persisted on receipt. Meta's media URL is short-lived and needs
//     an auth header even then, so nothing may store a Meta URL.
//  2. Nothing is ever served statically. There is no path a browser can reach
//     without going through an authenticated handler on the admin instance.
//  3. Everything is encrypted at rest. A stolen disk image, a mislaid backup
//     or a bucket left open yields ciphertext.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'var/documents');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// First bytes of each accepted format. Meta reports a mime type and a web form
// claims one; neither is evidence. A .jpg that is really a script is only a
// problem if something believes the label.
const MAGIC: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

const MAX_BYTES = 8 * 1024 * 1024;

export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
}

export class DocumentRejected extends Error {}

function key(): Buffer {
  const raw = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!raw) throw new Error('DOCUMENT_ENCRYPTION_KEY is required');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('DOCUMENT_ENCRYPTION_KEY must be 32 bytes, base64');
  return buf;
}

/** What the bytes actually are, or undefined if they are nothing we accept. */
function sniff(bytes: Buffer): string | undefined {
  return MAGIC.find(({ bytes: sig, offset = 0 }) =>
    sig.every((b, i) => bytes[offset + i] === b)
  )?.mime;
}

export async function saveMedia(
  base64: string,
  claimedMime: string,
  folder: string
): Promise<StoredFile> {
  const bytes = Buffer.from(stripDataUrl(base64), 'base64');

  if (bytes.length === 0) throw new DocumentRejected('empty file');
  if (bytes.length > MAX_BYTES) throw new DocumentRejected('file is larger than 8 MB');

  const actual = sniff(bytes);
  if (!actual || !ALLOWED[actual]) {
    throw new DocumentRejected(`unsupported file type (claimed ${claimedMime})`);
  }

  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const name = `${crypto.randomUUID()}${ALLOWED[actual]}.enc`;
  const storageKey = `${folder}/${name}`;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);

  const dest = path.join(UPLOAD_ROOT, folder);
  await fs.promises.mkdir(dest, { recursive: true, mode: 0o700 });
  await fs.promises.writeFile(
    path.join(dest, name),
    Buffer.concat([iv, cipher.getAuthTag(), ciphertext]),
    { mode: 0o600 }
  );

  return { storageKey, sizeBytes: bytes.length, sha256, mimeType: actual };
}

/**
 * Decrypt a stored document.
 *
 * Only ever called from an authenticated handler that has already decided this
 * person may see this file, and that writes an audit row for the fact that
 * they did.
 */
export async function readDocument(storageKey: string): Promise<Buffer> {
  const file = await fs.promises.readFile(resolvePath(storageKey));

  const iv = file.subarray(0, IV_BYTES);
  const tag = file.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = file.subarray(IV_BYTES + TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function deleteDocument(storageKey: string): Promise<void> {
  await fs.promises.rm(resolvePath(storageKey), { force: true });
}

/** Storage keys are ours, but a path traversal here reads arbitrary files. */
function resolvePath(storageKey: string): string {
  const full = path.resolve(UPLOAD_ROOT, storageKey);
  if (full !== UPLOAD_ROOT && !full.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new DocumentRejected('storage key escapes the document root');
  }
  return full;
}

export { UPLOAD_ROOT };

function stripDataUrl(s: string): string {
  const i = s.indexOf('base64,');
  return i >= 0 ? s.slice(i + 7) : s;
}
