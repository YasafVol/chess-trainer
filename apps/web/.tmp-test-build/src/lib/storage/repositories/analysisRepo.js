import { withStore } from "../db";
function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
}
export async function saveAnalysisRun(run) {
    await withStore("analysisRuns", "readwrite", async (store) => {
        await requestToPromise(store.put(run));
    });
}
export async function getLatestAnalysisRunByGameId(gameId) {
    return withStore("analysisRuns", "readonly", async (store) => {
        const index = store.index("by_gameId");
        const result = (await requestToPromise(index.getAll(gameId)));
        if (!result || result.length === 0)
            return null;
        return result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;
    });
}
export async function savePlyAnalysis(ply) {
    await withStore("analysisByPly", "readwrite", async (store) => {
        await requestToPromise(store.put(ply));
    });
}
export async function listPlyAnalysisByGameId(gameId) {
    return withStore("analysisByPly", "readonly", async (store) => {
        const index = store.index("by_gameId");
        const result = (await requestToPromise(index.getAll(gameId)));
        return (result ?? []).sort((a, b) => a.ply - b.ply);
    });
}
export async function listPlyAnalysisByRunId(runId) {
    return withStore("analysisByPly", "readonly", async (store) => {
        const index = store.index("by_runId");
        const result = (await requestToPromise(index.getAll(runId)));
        return (result ?? []).sort((a, b) => a.ply - b.ply);
    });
}
