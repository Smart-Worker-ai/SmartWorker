import api from './api.js';

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(value) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptCredentials(username, password) {
  const { data } = await api.get('/auth/login-key');
  const rsaKey = await crypto.subtle.importKey(
    'spki',
    fromBase64(data.spki),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const rawAes = await crypto.subtle.exportKey('raw', aesKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({
    username,
    password,
    nonce: data.nonce,
    ts: Date.now(),
  }));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plain);
  const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaKey, rawAes);
  return { key: toBase64(wrapped), iv: toBase64(iv), data: toBase64(cipher) };
}
