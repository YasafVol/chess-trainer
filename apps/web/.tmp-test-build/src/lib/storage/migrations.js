const DB_VERSION = 1;
export const migrations = [
    {
        toVersion: 1,
        apply: (db) => {
            if (!db.objectStoreNames.contains("games")) {
                const games = db.createObjectStore("games", { keyPath: "id" });
                games.createIndex("by_updatedAt", "updatedAt", { unique: false });
                games.createIndex("by_hash", "hash", { unique: false });
            }
            if (!db.objectStoreNames.contains("analysisRuns")) {
                const runs = db.createObjectStore("analysisRuns", { keyPath: "id" });
                runs.createIndex("by_gameId", "gameId", { unique: false });
                runs.createIndex("by_createdAt", "createdAt", { unique: false });
            }
            if (!db.objectStoreNames.contains("analysisByPly")) {
                const plies = db.createObjectStore("analysisByPly", { keyPath: "id" });
                plies.createIndex("by_runId", "runId", { unique: false });
                plies.createIndex("by_gameId", "gameId", { unique: false });
                plies.createIndex("by_gameId_ply", ["gameId", "ply"], { unique: false });
            }
            if (!db.objectStoreNames.contains("appMeta")) {
                db.createObjectStore("appMeta", { keyPath: "key" });
            }
        }
    }
];
export function getDbVersion() {
    return DB_VERSION;
}
