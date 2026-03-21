import { CHESS_COM_SYNC_CONFIG_DEFAULTS } from "../../../domain/chessComSyncConfig.js";
import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { ANALYSIS_COORDINATOR_CONFIG_DEFAULTS } from "../../../domain/analysisCoordinatorConfig.js";
import { PUZZLE_PLAYBACK_CONFIG_DEFAULTS } from "../../../domain/puzzlePlaybackConfig.js";
import {
  getAnalysisCoordinatorConfig,
  getChessComSyncConfig,
  getPuzzlePlaybackConfig,
  saveAnalysisCoordinatorConfig,
  saveChessComSyncConfig,
  savePuzzlePlaybackConfig
} from "./appMetaRepo.js";

test("app meta repo returns the lazy-analysis defaults when no config is stored", async () => {
  assert.deepEqual(await getAnalysisCoordinatorConfig(), ANALYSIS_COORDINATOR_CONFIG_DEFAULTS);
});

test("app meta repo persists the lazy-analysis config", async () => {
  await saveAnalysisCoordinatorConfig({
    enabled: false,
    intervalMs: 45000
  });

  assert.deepEqual(await getAnalysisCoordinatorConfig(), {
    enabled: false,
    intervalMs: 45000
  });
});

test("app meta repo returns the puzzle playback defaults when no config is stored", async () => {
  assert.deepEqual(await getPuzzlePlaybackConfig(), PUZZLE_PLAYBACK_CONFIG_DEFAULTS);
});

test("app meta repo persists the puzzle playback config", async () => {
  await savePuzzlePlaybackConfig({
    stepMs: 700
  });

  assert.deepEqual(await getPuzzlePlaybackConfig(), {
    stepMs: 700
  });
});

test("app meta repo returns the Chess.com sync defaults when no config is stored", async () => {
  assert.deepEqual(await getChessComSyncConfig(), {
    ...CHESS_COM_SYNC_CONFIG_DEFAULTS,
    lastSyncAt: undefined,
    lastSuccessfulArchive: undefined,
    lastStatus: undefined
  });
});

test("app meta repo persists the Chess.com sync config", async () => {
  await saveChessComSyncConfig({
    username: "  Hikaru  ",
    enabled: true,
    interval: "weekly",
    lastSyncAt: "2026-03-20T09:00:00.000Z",
    lastSuccessfulArchive: "2026-03",
    lastStatus: "Imported 3 games."
  });

  assert.deepEqual(await getChessComSyncConfig(), {
    username: "hikaru",
    enabled: true,
    interval: "weekly",
    lastSyncAt: "2026-03-20T09:00:00.000Z",
    lastSuccessfulArchive: "2026-03",
    lastStatus: "Imported 3 games."
  });
});
