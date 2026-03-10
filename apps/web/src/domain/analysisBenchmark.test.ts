import test from "node:test";
import assert from "node:assert/strict";
import { ANALYSIS_BENCHMARK_REPETITIONS, buildAnalysisBenchmarkScenarios, summarizeAnalysisBenchmarkScenario } from "./analysisBenchmark.js";

test("buildAnalysisBenchmarkScenarios returns the fixed standard sweep", () => {
  const scenarios = buildAnalysisBenchmarkScenarios();

  assert.equal(ANALYSIS_BENCHMARK_REPETITIONS, 5);
  assert.deepEqual(
    scenarios.map((scenario) => scenario.id),
    ["baseline", "depth-12", "depth-18", "movetime-800", "movetime-1600", "multipv-2", "engine-single"]
  );
  assert.equal(scenarios[0]?.settings.engineFlavor, "stockfish-18-lite-single");
  assert.equal(scenarios[5]?.settings.multiPV, 2);
  assert.equal(scenarios[6]?.settings.engineFlavor, "stockfish-18-single");
});

test("summarizeAnalysisBenchmarkScenario computes recommendation metrics from p95 runtime", () => {
  const summary = summarizeAnalysisBenchmarkScenario({
    totalPlies: 49,
    repetitions: [
      {
        repetition: 1,
        engineInitMs: 20,
        runMs: 1000,
        analyzedPlies: 50,
        retriesUsed: 0,
        stoppedByBudget: false,
        finalStatus: "completed",
        plyTimeMs: [100, 120]
      },
      {
        repetition: 2,
        engineInitMs: 25,
        runMs: 1200,
        analyzedPlies: 48,
        retriesUsed: 1,
        stoppedByBudget: true,
        finalStatus: "cancelled",
        plyTimeMs: [140, 160]
      },
      {
        repetition: 3,
        engineInitMs: 22,
        runMs: 1100,
        analyzedPlies: 49,
        retriesUsed: 0,
        stoppedByBudget: false,
        finalStatus: "completed",
        plyTimeMs: [180]
      }
    ]
  });

  assert.equal(summary.runsCompleted, 3);
  assert.equal(summary.avgRunMs, 1100);
  assert.equal(summary.medianRunMs, 1100);
  assert.equal(summary.p95RunMs, 1190);
  assert.equal(summary.avgPlyMs, 140);
  assert.equal(summary.medianPlyMs, 140);
  assert.equal(summary.p95PlyMs, 176);
  assert.equal(summary.avgAnalyzedPlies, 49);
  assert.equal(summary.avgRetriesPerRun, 0);
  assert.equal(summary.budgetStops, 1);
  assert.equal(summary.recommendedBudgetMs, 1369);
  assert.equal(summary.recommendedBudgetPerPlyMs, 28);
});
