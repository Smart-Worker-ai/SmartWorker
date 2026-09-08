// Document storage. Local disk for the beta; the public API is deliberately the
// same shape as the R2/S3 module it replaces, so going live is a swap of the
// two private functions below and nothing else.
//
// The important property, inherited from how WhatsApp serves media: Meta's
// download URL is short-lived and needs an auth header, so nothing may store a
// Meta URL. Bytes are persisted on receipt or they are lost.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'apps/api/uploads');

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
}

export async function saveMedia(
  base64: string,
  mimeType: string,
  folder: string
): Promise<StoredFile> {
  const bytes = Buffer.from(stripDataUrl(base64), 'base64');
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const name = `${crypto.randomUUID()}${EXT[mimeType] ?? '.bin'}`;
  const key = `${folder}/${name}`;

  const dest = path.join(UPLOAD_ROOT, folder);
  await fs.promises.mkdir(dest, { recursive: true });
  await fs.promises.writeFile(path.join(dest, name), bytes);

  return { storageKey: key, sizeBytes: bytes.length, sha256, mimeType };
}

/**
 * Turn a stored key into something a browser can load.
 *
 * Local returns a served path. The R2 implementation returns a presigned URL
 * with a short expiry — which is why callers must treat this as short-lived and
 * never persist the result. KYC images are not public objects.
 */
export function resolveUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) return null;
  return `/uploads/${storageKey}`;
}

export function localPath(storageKey: string): string {
  return path.join(UPLOAD_ROOT, storageKey);
}

export { UPLOAD_ROOT };

function stripDataUrl(s: string): string {
  const i = s.indexOf('base64,');
  return i >= 0 ? s.slice(i + 7) : s;
}
