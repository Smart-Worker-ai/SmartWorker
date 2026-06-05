import crypto from 'node:crypto';
import { env } from '../config/env.js';

// In-memory document store — replace with Supabase + DB when configured
const vaultStore = new Map(); // userId → Document[]

async function requestUploadUrl(request, response) {
  const { fileName, fileType } = request.body;
  if (!fileName || !fileType) {
    return response.status(400).json({ message: 'fileName and fileType are required.' });
  }
  const docId = crypto.randomUUID();
  const userId = request.user.userId;

  let uploadUrl;
  if (env.supabaseUrl) {
    uploadUrl = `${env.supabaseUrl}/storage/v1/object/vault/${userId}/${docId}-${encodeURIComponent(fileName)}`;
  } else {
    // Dev stub — the Flutter app will upload nothing but can still record the document
    uploadUrl = `http://localhost:${env.port}/dev-upload/${docId}`;
  }

  response.json({ uploadUrl, docId });
}

async function saveDocument(request, response) {
  const { docId, fileName, fileType, url } = request.body;
  if (!fileName) {
    return response.status(400).json({ message: 'fileName is required.' });
  }
  const userId = request.user.userId;
  const docs = vaultStore.get(userId) ?? [];
  const doc = {
    id: docId ?? crypto.randomUUID(),
    fileName,
    fileType: fileType ?? 'unknown',
    url: url ?? '',
    uploadedAt: new Date().toISOString()
  };
  docs.unshift(doc);
  vaultStore.set(userId, docs);
  response.json({ document: doc });
}

async function listDocuments(request, response) {
  const docs = vaultStore.get(request.user.userId) ?? [];
  response.json({ documents: docs });
}

export { requestUploadUrl, saveDocument, listDocuments };
