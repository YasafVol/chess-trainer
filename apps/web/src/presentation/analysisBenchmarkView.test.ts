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

  assert.equal(scenarios.length, 7);
  assert.equal(scenarios[0]?.title, "Baseline");
  assert.equal(knobs[0]?.key, "engineFlavor");
  assert.equal(blocked[0]?.key, "threads");
  assert.equal(blocked[1]?.key, "hashMb");
});

test("analysis benchmark result rows format completed and skipped scenarios", () => {
  const rows = buildAnalysisBenchmarkResultRows([
    {
      status: "completed",
      scenario: {
        id: "baseline",
        label: "Baseline",
        description: "",
        settings: {
          engineFlavor: "stockfish-18-lite-single",
          depth: 16,
          movetimeMs: 1200,
          multiPV: 1,
          baseForegroundBudgetMs: 60000,
          foregroundBudgetPerPlyMs: 600
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
        budgetStops: 0,
        recommendedBudgetMs: 1380,
        recommendedBudgetPerPlyMs: 29
      },
      note: "Completed"
    },
    {
      status: "skipped",
      scenario: {
        id: "engine-single",
        label: "Single Engine",
        description: "",
        settings: {
          engineFlavor: "stockfish-18-single",
          depth: 16,
          movetimeMs: 1200,
          multiPV: 1,
          baseForegroundBudgetMs: 60000,
          foregroundBudgetPerPlyMs: 600
        }
      },
      repetitions: [],
      reason: "Unsupported in this environment: worker init failed"
    }
  ]);

  assert.equal(rows[0]?.runsCompleted, "5/5");
  assert.equal(rows[0]?.p95RunMs, "1200ms");
  assert.equal(rows[0]?.derivedBudgetPerPlyMs, "29ms");
  assert.equal(rows[1]?.runsCompleted, "0/5");
  assert.equal(rows[1]?.statusText, "Unsupported in this environment: worker init failed");
});
