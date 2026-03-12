import type { AnalysisRun, PlyAnalysis } from "../../../domain/types.js";
import { assertBenchmarkStoreIndex, clearBenchmarkAnalysisStores, withBenchmarkStore } from "../benchmarkDb.js";
import { formatUnknownError } from "../../formatUnknownError.js";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function saveBenchmarkAnalysisRun(run: AnalysisRun): Promise<void> {
  try {
    console.log("[benchmark-storage] save run start", {
      runId: run.id,
      gameId: run.gameId,
      status: run.status
    });
    await withBenchmarkStore("analysisRuns", "readwrite", async (store) => {
      await requestToPromise(store.put(run));
    });
    console.log("[benchmark-storage] save run complete", {
      runId: run.id,
      gameId: run.gameId,
      status: run.status
    });
  } catch (error) {
    throw new Error(`saveBenchmarkAnalysisRun failed: ${formatUnknownError(error, "Unknown benchmark run save error")}`);
  }
}

export async function saveBenchmarkPlyAnalysis(ply: PlyAnalysis): Promise<void> {
  try {
    console.log("[benchmark-storage] save ply start", {
      runId: ply.runId,
      gameId: ply.gameId,
      ply: ply.ply,
      timeMs: ply.timeMs
    });
    await withBenchmarkStore("analysisByPly", "readwrite", async (store) => {
      await requestToPromise(store.put(ply));
    });
    console.log("[benchmark-storage] save ply complete", {
      runId: ply.runId,
      gameId: ply.gameId,
      ply: ply.ply,
      timeMs: ply.timeMs
    });
  } catch (error) {
    throw new Error(`saveBenchmarkPlyAnalysis failed for ply ${ply.ply}: ${formatUnknownError(error, "Unknown benchmark ply save error")}`);
  }
}

export async function listBenchmarkPlyAnalysisByRunId(runId: string): Promise<PlyAnalysis[]> {
  try {
    console.log("[benchmark-storage] list plies start", { runId });
    return await withBenchmarkStore("analysisByPly", "readonly", async (store) => {
      assertBenchmarkStoreIndex(store, "analysisByPly", "by_runId");
      const index = store.index("by_runId");
      const result = (await requestToPromise(index.getAll(runId))) as PlyAnalysis[];
      console.log("[benchmark-storage] list plies complete", {
        runId,
        count: (result ?? []).length
      });
      return (result ?? []).sort((a, b) => a.ply - b.ply);
    });
  } catch (error) {
    throw new Error(`listBenchmarkPlyAnalysisByRunId failed for run ${runId}: ${formatUnknownError(error, "Unknown benchmark ply reload error")}`);
  }
}

export async function clearBenchmarkAnalysisData(): Promise<void> {
  try {
    console.log("[benchmark-storage] clear analysis data start");
    await clearBenchmarkAnalysisStores();
    console.log("[benchmark-storage] clear analysis data complete");
  } catch (error) {
    throw new Error(`clearBenchmarkAnalysisData failed: ${formatUnknownError(error, "Unknown benchmark clear error")}`);
  }
}
