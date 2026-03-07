const DB_VERSION = 2;

export type Migration = {
  toVersion: number;
  apply: (db: IDBDatabase, tx: IDBTransaction) => void;
};

export const migrations: Migration[] = [
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
  },
  {
    toVersion: 2,
    apply: (db) => {
      if (!db.objectStoreNames.contains("puzzles")) {
        const puzzles = db.createObjectStore("puzzles", { keyPath: "id" });
        puzzles.createIndex("by_updatedAt", "updatedAt", { unique: false });
        puzzles.createIndex("by_gameId", "gameId", { unique: false });
        puzzles.createIndex("by_dueAt", "schedule.dueAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("puzzleAttempts")) {
        const attempts = db.createObjectStore("puzzleAttempts", { keyPath: "id" });
        attempts.createIndex("by_puzzleId", "puzzleId", { unique: false });
        attempts.createIndex("by_attemptedAt", "attemptedAt", { unique: false });
      }
    }
  }
];

export function getDbVersion(): number {
  return DB_VERSION;
}
