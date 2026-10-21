import { fetchMeta, fetchAllRecords, saveRecordsIfMetaMatches, clearAllData } from './db.js';
import { KEY_DERIVATION_ITERATIONS, createSalt, deriveKey, encryptJson, decryptJson } from './crypto.js';

export const MINIMUM_PASSPHRASE_LENGTH = 8;
const VAULT_META_ID = 'vault';
const VERIFIER_VALUE = 'interhospitaltransfer-vault';
const CHANNEL_NAME = 'interhospitaltransfer-vault';
const STALE_SESSION_MESSAGE = 'Das Passwort wurde in einem anderen Fenster neu eingerichtet. Bitte entsperren und erneut speichern.';
const ALREADY_CONFIGURED_MESSAGE = 'In einem anderen Fenster wurde gerade ein Passwort eingerichtet. Bitte dieses Passwort zum Entsperren verwenden.';
export const BROADCAST_VAULT_CHANGED = 'vault-changed';
export const BROADCAST_LOCK = 'lock';

// Schlüssel und Generation (eindeutige Kennung je Passwort-Einrichtung) liegen nur im Arbeitsspeicher.
let sessionKey = null;
let sessionGeneration = null;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

// Nachrichten an andere Fenster der App: Schlüssel ungültig (BROADCAST_VAULT_CHANGED) oder Sperren (BROADCAST_LOCK).
export function onBroadcast(handler) {
  channel?.addEventListener('message', event => handler(event.data));
}

export function broadcastLock() {
  channel?.postMessage(BROADCAST_LOCK);
}

export async function isVaultConfigured() {
  return Boolean(await fetchMeta(VAULT_META_ID));
}

export function isUnlocked() {
  return sessionKey !== null;
}

export function lockVault() {
  sessionKey = null;
  sessionGeneration = null;
}

export function requireKey() {
  if (!sessionKey) throw new Error('Die App ist gesperrt.');
  return sessionKey;
}

// Legt das Passwort fest und verschlüsselt bereits vorhandene Klartext-Einträge (Version 1.0).
export async function setupVault(passphrase) {
  // Schutz vor Neuverschlüsselung mit neuem Schlüssel: bestehende Einträge wären sonst unlesbar.
  if (await isVaultConfigured()) throw new Error('Es ist bereits ein Passwort eingerichtet.');
  const salt = createSalt();
  const key = await deriveKey(passphrase, salt, KEY_DERIVATION_ITERATIONS);
  const plaintextRecords = (await fetchAllRecords()).filter(record => !isEncrypted(record));
  const encryptedRecords = await Promise.all(plaintextRecords.map(record => encryptRecord(key, record)));
  const verifier = await encryptJson(key, VERIFIER_VALUE);
  const generation = crypto.randomUUID();
  await saveRecordsIfMetaMatches(encryptedRecords, {
    metaId: VAULT_META_ID,
    isExpectedMeta: meta => !meta,
    staleMessage: ALREADY_CONFIGURED_MESSAGE,
    newMeta: { id: VAULT_META_ID, salt, iterations: KEY_DERIVATION_ITERATIONS, verifier, generation },
  });
  sessionKey = key;
  sessionGeneration = generation;
  channel?.postMessage(BROADCAST_VAULT_CHANGED);
}

export async function unlockVault(passphrase) {
  const meta = await fetchMeta(VAULT_META_ID);
  if (!meta) throw new Error('Es ist noch kein Passwort eingerichtet.');
  const key = await deriveKey(passphrase, meta.salt, meta.iterations);
  let verifier = null;
  try {
    verifier = await decryptJson(key, meta.verifier);
  } catch {
    // AES-GCM schlägt bei falschem Schlüssel fehl; das ist hier der erwartete Fall.
  }
  if (verifier !== VERIFIER_VALUE) throw new Error('Falsches Passwort.');
  sessionKey = key;
  sessionGeneration = meta.generation ?? null;
}

export async function resetVault() {
  lockVault();
  await clearAllData();
  channel?.postMessage(BROADCAST_VAULT_CHANGED);
}

// Verschlüsselt speichern; schlägt fehl, wenn das Passwort inzwischen anderswo neu eingerichtet wurde.
export async function saveEncryptedEntry(entry) {
  const key = requireKey();
  const generation = sessionGeneration;
  const record = await encryptRecord(key, entry);
  await saveRecordsIfMetaMatches([record], {
    metaId: VAULT_META_ID,
    isExpectedMeta: meta => Boolean(meta) && (meta.generation ?? null) === generation,
    staleMessage: STALE_SESSION_MESSAGE,
  });
}

// Im Klartext bleiben nur id, created und updated (Sortierung und automatische Löschung).
async function encryptRecord(key, entry) {
  const { iv, ciphertext } = await encryptJson(key, entry);
  return { id: entry.id, created: entry.created, updated: entry.updated, iv, ciphertext };
}

export async function decryptRecord(key, record) {
  if (!isEncrypted(record)) return record;
  try {
    return await decryptJson(key, record);
  } catch {
    return { id: record.id, updated: record.updated, isUnreadable: true };
  }
}

function isEncrypted(record) {
  return 'ciphertext' in record;
}
