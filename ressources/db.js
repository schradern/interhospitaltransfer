import { showStatus } from './status.js';

// Name bleibt unverändert (inkl. Schreibweise), damit bestehende lokale Einträge lesbar bleiben.
const DATABASE_NAME = 'TrabsferDB';
// Version 2: Speicher "meta" für die Verschlüsselungsparameter.
const DATABASE_VERSION = 2;
const ENTRY_STORE = 'items';
const META_STORE = 'meta';

let databasePromise = null;

export function openDatabase() {
  if (!databasePromise) {
    databasePromise = requestDatabase();
    databasePromise.catch(() => { databasePromise = null; });
  }
  return databasePromise;
}

function requestDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Dieser Browser unterstützt keine lokale Datenbank (IndexedDB).'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ENTRY_STORE)) {
        database.createObjectStore(ENTRY_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        // Neuere App-Version in einem anderen Tab: Verbindung freigeben und Neustart anfordern.
        database.close();
        databasePromise = null;
        showStatus('Die App wurde in einem anderen Tab aktualisiert. Bitte diese Seite neu laden.', 'warning');
      };
      resolve(database);
    };
    // Ältere Version in einem anderen Tab hält die Datenbank offen; Öffnen wartet, bis sie geschlossen wird.
    request.onblocked = () => {
      showStatus('Die App ist in einem anderen Tab noch in einer älteren Version geöffnet. Bitte diesen Tab schließen.', 'error');
    };
    request.onerror = () => {
      reject(new Error(`Lokale Datenbank konnte nicht geöffnet werden (${request.error?.message ?? 'unbekannter Fehler'}).`));
    };
  });
}

async function runTransaction(storeNames, mode, actionDescription, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = database.transaction(storeNames, mode);
    } catch (error) {
      reject(new Error(`${actionDescription} fehlgeschlagen (${error.message}). Bitte die App neu laden.`));
      return;
    }
    let result;
    const fail = () => {
      reject(new Error(`${actionDescription} fehlgeschlagen (${transaction.error?.message ?? 'Transaktion abgebrochen'}).`));
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = fail;
    transaction.onabort = fail;
    const request = operation(transaction);
    if (request) request.onsuccess = () => { result = request.result; };
  });
}

export function fetchAllRecords() {
  return runTransaction(ENTRY_STORE, 'readonly', 'Laden der Einträge', transaction => (
    transaction.objectStore(ENTRY_STORE).getAll()
  ));
}

export function deleteRecords(ids) {
  return runTransaction(ENTRY_STORE, 'readwrite', 'Löschen', transaction => {
    const store = transaction.objectStore(ENTRY_STORE);
    ids.forEach(id => store.delete(id));
  });
}

// Schreibt nur, wenn die Metadaten dem erwarteten Stand entsprechen; Prüfung und Schreiben laufen in
// derselben Transaktion, damit ein anderer Tab nicht dazwischen schreiben kann. Optional neue Metadaten.
export async function saveRecordsIfMetaMatches(records, { metaId, isExpectedMeta, staleMessage, newMeta = null }) {
  let isStale = false;
  try {
    await runTransaction([ENTRY_STORE, META_STORE], 'readwrite', 'Speichern', transaction => {
      const metaStore = transaction.objectStore(META_STORE);
      const metaRequest = metaStore.get(metaId);
      metaRequest.onsuccess = () => {
        if (!isExpectedMeta(metaRequest.result)) {
          isStale = true;
          transaction.abort();
          return;
        }
        const entryStore = transaction.objectStore(ENTRY_STORE);
        records.forEach(record => entryStore.put(record));
        if (newMeta) metaStore.put(newMeta);
      };
    });
  } catch (error) {
    throw isStale ? new Error(staleMessage) : error;
  }
}

export function fetchMeta(id) {
  return runTransaction(META_STORE, 'readonly', 'Laden der Einstellungen', transaction => (
    transaction.objectStore(META_STORE).get(id)
  ));
}

export function clearAllData() {
  return runTransaction([ENTRY_STORE, META_STORE], 'readwrite', 'Löschen aller Daten', transaction => {
    transaction.objectStore(ENTRY_STORE).clear();
    transaction.objectStore(META_STORE).clear();
  });
}
