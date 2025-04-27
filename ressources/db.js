let dbInstance = null;

export function getDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open('TrabsferDB', 1); // NOTE: Increment version number to re-trigger upgrade

        request.onerror = () => reject('DB failed to open');

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (e) => {
            const db = e.target.result;

            // ✅ Make sure this exists
            if (!db.objectStoreNames.contains('items')) {
                db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}