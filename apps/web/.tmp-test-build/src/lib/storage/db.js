import { getDbVersion, migrations } from "./migrations";
const DB_NAME = "chess-trainer-web";
let dbPromise = null;
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, getDbVersion());
        request.onupgradeneeded = () => {
            const db = request.result;
            const tx = request.transaction;
            if (!tx)
                return;
            for (const migration of migrations) {
                if (migration.toVersion <= db.version) {
                    migration.apply(db, tx);
                }
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    });
}
export function getDb() {
    if (!dbPromise) {
        dbPromise = openDb();
    }
    return dbPromise;
}
export function withStore(storeName, mode, operation) {
    return getDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        operation(store).then(resolve).catch(reject);
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    }));
}
