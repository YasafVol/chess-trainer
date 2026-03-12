import { getDbVersion, migrations } from "./migrations.js";
import { formatUnknownError } from "../formatUnknownError.js";

const BENCHMARK_DB_NAME = "chess-trainer-web-benchmark";

let benchmarkDbPromise: Promise<IDBDatabase> | null = null;

function assertBenchmarkStores(db: Pick<IDBDatabase, "objectStoreNames">): void {
  for (const storeName of ["analysisRuns", "analysisByPly"] as const) {
    if (!db.objectStoreNames.contains(storeName)) {
      throw new Error(`Benchmark IndexedDB missing store "${storeName}"`);
    }
  }
}

export function assertBenchmarkStoreIndex(
  store: Pick<IDBObjectStore, "indexNames">,
  storeName: "analysisRuns" | "analysisByPly",
  indexName: string
): void {
  if (!store.indexNames.contains(indexName)) {
    throw new Error(`Benchmark IndexedDB missing index "${indexName}" on "${storeName}"`);
  }
}

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

    request.onsuccess = () => {
      try {
        assertBenchmarkStores(request.result);
        resolve(request.result);
      } catch (error) {
        reject(new Error(`Failed to open benchmark IndexedDB: ${formatUnknownError(error, "Unknown benchmark DB schema error")}`));
      }
    };
    request.onerror = () => reject(new Error(`Failed to open benchmark IndexedDB: ${formatUnknownError(request.error, "Unknown benchmark DB open error")}`));
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
        try {
          assertBenchmarkStores(db);
          const tx = db.transaction(storeName, mode);
          const store = tx.objectStore(storeName);
          operation(store)
            .then(resolve)
            .catch((error) => reject(new Error(`Benchmark store "${storeName}" operation failed: ${formatUnknownError(error, "Unknown store error")}`)));
          tx.onerror = () => reject(new Error(`Benchmark IndexedDB transaction failed: ${formatUnknownError(tx.error, "Unknown transaction error")}`));
        } catch (error) {
          reject(new Error(`Benchmark store "${storeName}" unavailable: ${formatUnknownError(error, "Unknown benchmark store error")}`));
        }
      })
  );
}

export async function clearBenchmarkAnalysisStores(): Promise<void> {
  const db = await getBenchmarkDb();
  await new Promise<void>((resolve, reject) => {
    try {
      assertBenchmarkStores(db);
      const tx = db.transaction(["analysisRuns", "analysisByPly"], "readwrite");
      tx.objectStore("analysisRuns").clear();
      tx.objectStore("analysisByPly").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`clearBenchmarkAnalysisData failed: ${formatUnknownError(tx.error, "Unknown benchmark clear error")}`));
    } catch (error) {
      reject(new Error(`clearBenchmarkAnalysisData failed: ${formatUnknownError(error, "Unknown benchmark clear error")}`));
    }
  });
}
