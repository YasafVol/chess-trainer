import test from "node:test";
import assert from "node:assert/strict";
import {
  PUZZLE_PLAYBACK_CONFIG_DEFAULTS,
  PUZZLE_PLAYBACK_STEP_MAX_MS,
  PUZZLE_PLAYBACK_STEP_MIN_MS,
  normalizePuzzlePlaybackConfig
} from "./puzzlePlaybackConfig.js";

test("normalizePuzzlePlaybackConfig falls back to the shipped default", () => {
  assert.deepEqual(
    normalizePuzzlePlaybackConfig(undefined),
    PUZZLE_PLAYBACK_CONFIG_DEFAULTS
  );
});

test("normalizePuzzlePlaybackConfig clamps playback speed into the supported range", () => {
  assert.equal(
    normalizePuzzlePlaybackConfig({ stepMs: 10 }).stepMs,
    PUZZLE_PLAYBACK_STEP_MIN_MS
  );
  assert.equal(
    normalizePuzzlePlaybackConfig({ stepMs: 99999 }).stepMs,
    PUZZLE_PLAYBACK_STEP_MAX_MS
  );
});
