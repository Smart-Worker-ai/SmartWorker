import { encryptText, decryptText } from '../utils/encryption.js';

function encryptVaultValue(value) {
  return encryptText(value);
}

function decryptVaultValue(value) {
  return decryptText(value);
}

export { encryptVaultValue, decryptVaultValue };
