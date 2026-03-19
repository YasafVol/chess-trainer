import test from "node:test";
import assert from "node:assert/strict";
import {
  ANALYSIS_COORDINATOR_CONFIG_DEFAULTS,
  ANALYSIS_COORDINATOR_INTERVAL_MAX_MS,
  ANALYSIS_COORDINATOR_INTERVAL_MIN_MS,
  normalizeAnalysisCoordinatorConfig
} from "./analysisCoordinatorConfig.js";

test("normalizeAnalysisCoordinatorConfig falls back to defaults", () => {
  assert.deepEqual(
    normalizeAnalysisCoordinatorConfig(undefined),
    ANALYSIS_COORDINATOR_CONFIG_DEFAULTS
  );
});

test("normalizeAnalysisCoordinatorConfig clamps the interval into the supported range", () => {
  assert.equal(
    normalizeAnalysisCoordinatorConfig({ intervalMs: 1000 }).intervalMs,
    ANALYSIS_COORDINATOR_INTERVAL_MIN_MS
  );
  assert.equal(
    normalizeAnalysisCoordinatorConfig({ intervalMs: 999999 }).intervalMs,
    ANALYSIS_COORDINATOR_INTERVAL_MAX_MS
  );
});

test("normalizeAnalysisCoordinatorConfig preserves explicit enabled state", () => {
  assert.deepEqual(
    normalizeAnalysisCoordinatorConfig({ enabled: false, intervalMs: 45000 }),
    { enabled: false, intervalMs: 45000 }
  );
});
