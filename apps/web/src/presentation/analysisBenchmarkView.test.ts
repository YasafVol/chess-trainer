import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnalysisBenchmarkBlockedRows,
  buildAnalysisBenchmarkKnobRows,
  buildAnalysisBenchmarkResultRows,
  buildAnalysisBenchmarkScenarioCards
} from "./analysisBenchmarkView.js";

test("analysis benchmark view exposes the fixed scenario cards and blocked knobs", () => {
  const scenarios = buildAnalysisBenchmarkScenarioCards();
  const knobs = buildAnalysisBenchmarkKnobRows();
  const blocked = buildAnalysisBenchmarkBlockedRows();

  assert.equal(scenarios.length, 6);
  assert.equal(scenarios[0]?.title, "Baseline");
  assert.equal(scenarios[1]?.comparisonNote, "Secondary diagnostic while movetime is active.");
  assert.equal(knobs[0]?.key, "engineFlavor");
  assert.match(knobs[0]?.help ?? "", /Prepared but not bundled in this build/);
  assert.equal(blocked[0]?.key, "threads");
  assert.equal(blocked[1]?.key, "hashMb");
});

test("analysis benchmark result rows format completed, skipped, and failed scenarios", () => {
  const rows = buildAnalysisBenchmarkResultRows([
    {
      status: "completed",
      scenario: {
        id: "baseline",
        label: "Baseline",
        description: "",
        comparisonMode: "primary",
        settings: {
          engineFlavor: "stockfish-18-lite-single",
          depth: 16,
          movetimeMs: 1200,
          multiPV: 1
        }
      },
      repetitions: [],
      summary: {
        runsCompleted: 5,
        avgRunMs: 1000,
        medianRunMs: 950,
        p95RunMs: 1200,
        avgPlyMs: 180,
        medianPlyMs: 170,
        p95PlyMs: 220,
        avgAnalyzedPlies: 49,
        avgRetriesPerRun: 1,
        safetyStops: 0,
        projectedFullRunMs: 8820,
        recommendedSafetyBudgetMs: 10143
      },
      note: "Completed"
    },
    {
      status: "skipped",
      scenario: {
        id: "engine-single",
        label: "Single Engine",
        description: "",
        comparisonMode: "primary",
        settings: {
          engineFlavor: "stockfish-18-single",
          depth: 16,
          movetimeMs: 1200,
          multiPV: 1
        }
      },
      repetitions: [],
      reason: "Unsupported in this environment: worker init failed"
      ,
      failedStep: "engine-init",
      failedRepetition: 1
    },
    {
      status: "failed",
      scenario: {
        id: "depth-12",
        label: "Depth 12",
        description: "",
        comparisonMode: "secondary",
        settings: {
          engineFlavor: "stockfish-18-lite-single",
          depth: 12,
          movetimeMs: 1200,
          multiPV: 1
        }
      },
      repetitions: [],
      reason: "clearBenchmarkAnalysisData failed: DB full",
      failedStep: "clear-storage",
      failedRepetition: 1
    }
  ]);

  assert.equal(rows[0]?.runsCompleted, "5/5");
  assert.equal(rows[0]?.p95RunMs, "1200ms");
  assert.equal(rows[0]?.projectedFullRunMs, "8820ms");
  assert.equal(rows[1]?.runsCompleted, "0/5");
  assert.equal(rows[1]?.statusText, "Unsupported in this environment: worker init failed");
  assert.equal(rows[2]?.runsCompleted, "0/5");
  assert.equal(rows[2]?.statusText, "Failed at run 1 (clear-storage): clearBenchmarkAnalysisData failed: DB full");
});
