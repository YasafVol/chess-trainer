import { getDbVersion, migrations } from "./migrations.js";

const BENCHMARK_DB_NAME = "chess-trainer-web-benchmark";

let benchmarkDbPromise: Promise<IDBDatabase> | null = null;

function openBenchmarkDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BENCHMARK_DB_NAME, getDbVersion());

    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      if (!tx) return;

      for (const migration of migrations) {
        if (migration.toVersion <= db.version) {
          migration.apply(db, tx);
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open benchmark IndexedDB"));
  });
}

export function getBenchmarkDb(): Promise<IDBDatabase> {
  if (!benchmarkDbPromise) {
    benchmarkDbPromise = openBenchmarkDb();
  }
  return benchmarkDbPromise;
}

export function withBenchmarkStore<T>(
  storeName: "analysisRuns" | "analysisByPly",
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  return getBenchmarkDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        operation(store).then(resolve).catch(reject);
        tx.onerror = () => reject(tx.error ?? new Error("Benchmark IndexedDB transaction failed"));
      })
  );
}

export async function clearBenchmarkAnalysisStores(): Promise<void> {
  const db = await getBenchmarkDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["analysisRuns", "analysisByPly"], "readwrite");
    tx.objectStore("analysisRuns").clear();
    tx.objectStore("analysisByPly").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to clear benchmark analysis stores"));
  });
}
