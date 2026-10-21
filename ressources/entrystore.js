import { fetchAllRecords, deleteRecords } from './db.js';
import { requireKey, decryptRecord, saveEncryptedEntry } from './vault.js';

export async function loadEntries() {
  const key = requireKey();
  const records = await fetchAllRecords();
  return Promise.all(records.map(record => decryptRecord(key, record)));
}

export function storeEntry(entry) {
  return saveEncryptedEntry(entry);
}

export function removeEntry(id) {
  return deleteRecords([id]);
}
