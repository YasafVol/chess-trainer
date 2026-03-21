import { CHESS_COM_SYNC_CONFIG_DEFAULTS, normalizeChessComSyncConfig } from "../../../domain/chessComSyncConfig.js";
import { normalizeAnalysisCoordinatorConfig } from "../../../domain/analysisCoordinatorConfig.js";
import { normalizePuzzlePlaybackConfig } from "../../../domain/puzzlePlaybackConfig.js";
import type { AnalysisCoordinatorConfig, ChessComSyncConfig, PuzzlePlaybackConfig } from "../../../domain/types.js";
import { withStore } from "../db.js";

const ANALYSIS_COORDINATOR_CONFIG_KEY = "analysisCoordinatorConfig";
const PUZZLE_PLAYBACK_CONFIG_KEY = "puzzlePlaybackConfig";
const CHESS_COM_SYNC_CONFIG_KEY = "chessComSyncConfig";

type AppMetaRecord<T> = {
  key: string;
  value: T;
};

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function getAnalysisCoordinatorConfig(): Promise<AnalysisCoordinatorConfig> {
  return withStore("appMeta", "readonly", async (store) => {
    const result = await requestToPromise(store.get(ANALYSIS_COORDINATOR_CONFIG_KEY));
    const record = (result as AppMetaRecord<AnalysisCoordinatorConfig> | undefined) ?? null;
    return normalizeAnalysisCoordinatorConfig(record?.value);
  });
}

export async function saveAnalysisCoordinatorConfig(config: AnalysisCoordinatorConfig): Promise<void> {
  await withStore("appMeta", "readwrite", async (store) => {
    await requestToPromise(store.put({
      key: ANALYSIS_COORDINATOR_CONFIG_KEY,
      value: normalizeAnalysisCoordinatorConfig(config)
    }));
  });
}

export async function getPuzzlePlaybackConfig(): Promise<PuzzlePlaybackConfig> {
  return withStore("appMeta", "readonly", async (store) => {
    const result = await requestToPromise(store.get(PUZZLE_PLAYBACK_CONFIG_KEY));
    const record = (result as AppMetaRecord<PuzzlePlaybackConfig> | undefined) ?? null;
    return normalizePuzzlePlaybackConfig(record?.value);
  });
}

export async function savePuzzlePlaybackConfig(config: PuzzlePlaybackConfig): Promise<void> {
  await withStore("appMeta", "readwrite", async (store) => {
    await requestToPromise(store.put({
      key: PUZZLE_PLAYBACK_CONFIG_KEY,
      value: normalizePuzzlePlaybackConfig(config)
    }));
  });
}

export async function getChessComSyncConfig(): Promise<ChessComSyncConfig> {
  return withStore("appMeta", "readonly", async (store) => {
    const result = await requestToPromise(store.get(CHESS_COM_SYNC_CONFIG_KEY));
    const record = (result as AppMetaRecord<ChessComSyncConfig> | undefined) ?? null;
    return normalizeChessComSyncConfig(record?.value ?? CHESS_COM_SYNC_CONFIG_DEFAULTS);
  });
}

export async function saveChessComSyncConfig(config: ChessComSyncConfig): Promise<void> {
  await withStore("appMeta", "readwrite", async (store) => {
    await requestToPromise(store.put({
      key: CHESS_COM_SYNC_CONFIG_KEY,
      value: normalizeChessComSyncConfig(config)
    }));
  });
}
