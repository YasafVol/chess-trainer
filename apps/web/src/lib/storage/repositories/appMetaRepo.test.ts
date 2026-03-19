import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { ANALYSIS_COORDINATOR_CONFIG_DEFAULTS } from "../../../domain/analysisCoordinatorConfig.js";
import { PUZZLE_PLAYBACK_CONFIG_DEFAULTS } from "../../../domain/puzzlePlaybackConfig.js";
import {
  getAnalysisCoordinatorConfig,
  getPuzzlePlaybackConfig,
  saveAnalysisCoordinatorConfig,
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
