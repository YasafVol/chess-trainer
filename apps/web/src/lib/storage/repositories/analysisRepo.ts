import type { AnalysisRun, PlyAnalysis } from "../../../domain/types.js";
import { withStore } from "../db.js";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function saveAnalysisRun(run: AnalysisRun): Promise<void> {
  await withStore("analysisRuns", "readwrite", async (store) => {
    await requestToPromise(store.put(run));
  });
}

export async function getLatestAnalysisRunByGameId(gameId: string): Promise<AnalysisRun | null> {
  return withStore("analysisRuns", "readonly", async (store) => {
    const index = store.index("by_gameId");
    const result = (await requestToPromise(index.getAll(gameId))) as AnalysisRun[];
    if (!result || result.length === 0) return null;
    return result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;
  });
}

export async function savePlyAnalysis(ply: PlyAnalysis): Promise<void> {
  await withStore("analysisByPly", "readwrite", async (store) => {
    await requestToPromise(store.put(ply));
  });
}

export async function listPlyAnalysisByGameId(gameId: string): Promise<PlyAnalysis[]> {
  return withStore("analysisByPly", "readonly", async (store) => {
    const index = store.index("by_gameId");
    const result = (await requestToPromise(index.getAll(gameId))) as PlyAnalysis[];
    return (result ?? []).sort((a, b) => a.ply - b.ply);
  });
}

export async function listPlyAnalysisByRunId(runId: string): Promise<PlyAnalysis[]> {
  return withStore("analysisByPly", "readonly", async (store) => {
    const index = store.index("by_runId");
    const result = (await requestToPromise(index.getAll(runId))) as PlyAnalysis[];
    return (result ?? []).sort((a, b) => a.ply - b.ply);
  });
}
