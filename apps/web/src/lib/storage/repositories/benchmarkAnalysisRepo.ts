import type { AnalysisRun, PlyAnalysis } from "../../../domain/types.js";
import { clearBenchmarkAnalysisStores, withBenchmarkStore } from "../benchmarkDb.js";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function saveBenchmarkAnalysisRun(run: AnalysisRun): Promise<void> {
  await withBenchmarkStore("analysisRuns", "readwrite", async (store) => {
    await requestToPromise(store.put(run));
  });
}

export async function saveBenchmarkPlyAnalysis(ply: PlyAnalysis): Promise<void> {
  await withBenchmarkStore("analysisByPly", "readwrite", async (store) => {
    await requestToPromise(store.put(ply));
  });
}

export async function listBenchmarkPlyAnalysisByRunId(runId: string): Promise<PlyAnalysis[]> {
  return withBenchmarkStore("analysisByPly", "readonly", async (store) => {
    const index = store.index("by_runId");
    const result = (await requestToPromise(index.getAll(runId))) as PlyAnalysis[];
    return (result ?? []).sort((a, b) => a.ply - b.ply);
  });
}

export async function clearBenchmarkAnalysisData(): Promise<void> {
  await clearBenchmarkAnalysisStores();
}
