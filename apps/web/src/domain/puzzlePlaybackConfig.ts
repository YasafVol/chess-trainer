import type { PuzzlePlaybackConfig } from "./types.js";

export const PUZZLE_PLAYBACK_STEP_MIN_MS = 200;
export const PUZZLE_PLAYBACK_STEP_MAX_MS = 2000;
export const PUZZLE_PLAYBACK_CONFIG_DEFAULTS: PuzzlePlaybackConfig = {
  stepMs: 450
};

export function normalizePuzzlePlaybackConfig(
  input: Partial<PuzzlePlaybackConfig> | null | undefined
): PuzzlePlaybackConfig {
  const rawStepMs = typeof input?.stepMs === "number"
    ? input.stepMs
    : PUZZLE_PLAYBACK_CONFIG_DEFAULTS.stepMs;
  const stepMs = Math.min(
    PUZZLE_PLAYBACK_STEP_MAX_MS,
    Math.max(PUZZLE_PLAYBACK_STEP_MIN_MS, Math.round(rawStepMs))
  );

  return {
    stepMs
  };
}
