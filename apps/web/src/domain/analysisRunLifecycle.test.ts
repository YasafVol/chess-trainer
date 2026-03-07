import test from "node:test";
import assert from "node:assert/strict";
import { finalizeRun, transitionRunStatus } from "./analysisRunLifecycle.js";
import type { AnalysisRun } from "./types.js";

function sampleRun(status: AnalysisRun["status"] = "running"): AnalysisRun {
  return {
    id: "run-1",
    userId: "user-1",
    gameId: "game-1",
    schemaVersion: 1,
    engineName: "Stockfish",
    engineVersion: "18",
    engineFlavor: "stockfish-18-single",
    options: {
      depth: 16,
      multiPV: 1,
      movetimeMs: 1200
    },
    status,
    createdAt: "2026-03-05T00:00:00.000Z"
  };
}

test("transitionRunStatus moves queued run to running on start", () => {
  assert.equal(transitionRunStatus("queued", "start"), "running");
});

test("transitionRunStatus resolves running run to expected terminal states", () => {
  assert.equal(transitionRunStatus("running", "complete"), "completed");
  assert.equal(transitionRunStatus("running", "cancel"), "cancelled");
  assert.equal(transitionRunStatus("running", "fail"), "failed");
});

test("transitionRunStatus keeps terminal states unchanged", () => {
  assert.equal(transitionRunStatus("completed", "start"), "completed");
  assert.equal(transitionRunStatus("failed", "complete"), "failed");
  assert.equal(transitionRunStatus("cancelled", "fail"), "cancelled");
});

test("finalizeRun marks completed run with retry summary when retries were used", () => {
  const finalized = finalizeRun({
    run: sampleRun(),
    outcome: "completed",
    completedAt: "2026-03-05T00:10:00.000Z",
    retriesUsed: 2
  });

  assert.equal(finalized.status, "completed");
  assert.equal(finalized.completedAt, "2026-03-05T00:10:00.000Z");
  assert.equal(finalized.error, "Completed with 2 retries.");
});

test("finalizeRun marks cancelled run with budget stop message", () => {
  const finalized = finalizeRun({
    run: sampleRun(),
    outcome: "cancelled",
    completedAt: "2026-03-05T00:10:00.000Z",
    stoppedByBudget: true
  });

  assert.equal(finalized.status, "cancelled");
  assert.equal(finalized.error, "Stopped after foreground runtime budget; rerun to continue refining.");
});

test("finalizeRun marks failed run with explicit failure message", () => {
  const finalized = finalizeRun({
    run: sampleRun(),
    outcome: "failed",
    completedAt: "2026-03-05T00:10:00.000Z",
    failureMessage: "Engine worker error"
  });

  assert.equal(finalized.status, "failed");
  assert.equal(finalized.error, "Engine worker error");
});
