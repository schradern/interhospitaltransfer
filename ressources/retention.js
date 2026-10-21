import { fetchAllRecords, deleteRecords } from './db.js';

// Datenminimierung: Einträge werden RETENTION_DAYS nach der letzten Änderung gelöscht.
export const RETENTION_DAYS = 7;
const MILLISECONDS_PER_DAY = 86_400_000;
const RETENTION_MS = RETENTION_DAYS * MILLISECONDS_PER_DAY;

export function lastChangeOf(entry) {
  const time = new Date(entry.updated || entry.created || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function expiryOf(entry) {
  return new Date(lastChangeOf(entry) + RETENTION_MS);
}

// Läuft ohne Schlüssel, da die Zeitstempel unverschlüsselt gespeichert sind.
export async function purgeExpiredEntries(now = Date.now()) {
  const records = await fetchAllRecords();
  const expiredIds = records
    .filter(record => lastChangeOf(record) + RETENTION_MS <= now)
    .map(record => record.id);
  if (expiredIds.length > 0) await deleteRecords(expiredIds);
  return expiredIds.length;
}
