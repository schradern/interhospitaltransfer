// Passwortbasierte Verschlüsselung mit der Web Crypto API (PBKDF2-SHA-256 → AES-GCM 256).
// Iterationszahl nach OWASP Password Storage Cheat Sheet (2023) für PBKDF2-HMAC-SHA256.
export const KEY_DERIVATION_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_LENGTH_BITS = 256;

export function isCryptoAvailable() {
  return Boolean(window.isSecureContext && window.crypto?.subtle);
}

export function createSalt() {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

export async function deriveKey(passphrase, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJson(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv, ciphertext };
}

// Wirft bei falschem Schlüssel oder manipulierten Daten (AES-GCM prüft die Integrität).
export async function decryptJson(key, { iv, ciphertext }) {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}
