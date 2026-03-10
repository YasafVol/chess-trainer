import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisBenchmarkScenarios, type AnalysisBenchmarkScenario } from "../domain/analysisBenchmark.js";
import type { GameRecord, PlyAnalysis, AnalysisRun } from "../domain/types.js";
import { runAnalysisBenchmark, type AnalysisBenchmarkEngine } from "./runAnalysisBenchmark.js";

function sampleGame(movesUci: string[]): GameRecord {
  return {
    id: "game-1",
    userId: "user-1",
    schemaVersion: 1,
    hash: "hash-1",
    pgn: "1. e4 e5 *",
    headers: {},
    initialFen: "startpos",
    movesUci,
    source: "upload",
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z"
  };
}

function createEngineFactory(args: {
  failFlavor?: string;
  initCounter?: { value: number };
  analyzeCounter?: { value: number };
}): () => AnalysisBenchmarkEngine {
  return () => ({
    init: async (flavor) => {
      args.initCounter && (args.initCounter.value += 1);
      if (flavor === args.failFlavor) {
        throw new Error("worker init failed");
      }
    },
    analyzePosition: async (input) => {
      args.analyzeCounter && (args.analyzeCounter.value += 1);
      return {
        type: "engine:result" as const,
        payload: {
          bestMoveUci: input.searchMovesUci?.[0] ?? "e2e4",
          evaluationType: "cp" as const,
          evaluation: 12,
          depth: input.depth,
          nodes: 1000,
          nps: 2000,
          pvUci: input.searchMovesUci?.length ? [input.searchMovesUci[0]] : ["e2e4", "e7e5"]
        }
      };
    },
    terminate: () => undefined
  });
}

test("runAnalysisBenchmark aggregates completed scenarios and skips unsupported engine flavor", async () => {
  const scenarios = buildAnalysisBenchmarkScenarios().filter((scenario) =>
    scenario.id === "baseline" || scenario.id === "engine-single"
  );
  const savedPlies: PlyAnalysis[] = [];
  const savedRuns: AnalysisRun[] = [];
  const initCounter = { value: 0 };
  const analyzeCounter = { value: 0 };

  const result = await runAnalysisBenchmark({
    game: sampleGame(["e2e4"]),
    fenPositions: ["start", "after-e4"],
    moveSanList: ["e4"],
    totalPlies: 1,
    scenarios,
    repetitions: 2,
    createEngine: createEngineFactory({
      failFlavor: "stockfish-18-single",
      initCounter,
      analyzeCounter
    }),
    saveRun: async (run) => {
      savedRuns.push(run);
    },
    savePly: async (ply) => {
      savedPlies.push(ply);
    },
    listPlyAnalysisByRunId: async (runId) => savedPlies.filter((ply) => ply.runId === runId),
    clearStorage: async () => {
      savedPlies.length = 0;
      savedRuns.length = 0;
    },
    nowMs: (() => {
      let current = 0;
      return () => {
        current += 10;
        return current;
      };
    })(),
    analysisNowMs: (() => {
      let current = 0;
      return () => {
        current += 5;
        return current;
      };
    })(),
    analysisWaitMs: async () => undefined,
    createId: (() => {
      let i = 0;
      return () => `id-${++i}`;
    })()
  });

  assert.equal(initCounter.value, 3);
  assert.equal(analyzeCounter.value, 4);
  assert.equal(result.scenarios.length, 2);
  assert.equal(result.scenarios[0]?.status, "completed");
  if (result.scenarios[0]?.status === "completed") {
    assert.equal(result.scenarios[0].summary.runsCompleted, 2);
    assert.equal(result.scenarios[0].summary.avgAnalyzedPlies, 2);
  }
  assert.deepEqual(
    result.scenarios.map((scenario) => scenario.status),
    ["completed", "skipped"]
  );
});

test("runAnalysisBenchmark counts budget-stopped runs in the scenario summary", async () => {
  const budgetScenario: AnalysisBenchmarkScenario = {
    id: "budget-stop",
    label: "Budget stop",
    description: "Forces the foreground budget to trip.",
    settings: {
      engineFlavor: "stockfish-18-lite-single",
      depth: 16,
      movetimeMs: 1200,
      multiPV: 1,
      baseForegroundBudgetMs: 50,
      foregroundBudgetPerPlyMs: 10
    }
  };
  const savedPlies: PlyAnalysis[] = [];

  const result = await runAnalysisBenchmark({
    game: sampleGame(["e2e4", "e7e5", "g1f3"]),
    fenPositions: ["start", "p1", "p2", "p3"],
    moveSanList: ["e4", "e5", "Nf3"],
    totalPlies: 3,
    scenarios: [budgetScenario],
    repetitions: 1,
    createEngine: createEngineFactory({}),
    saveRun: async () => undefined,
    savePly: async (ply) => {
      savedPlies.push(ply);
    },
    listPlyAnalysisByRunId: async () => savedPlies,
    clearStorage: async () => {
      savedPlies.length = 0;
    },
    analysisNowMs: (() => {
      let current = 0;
      return () => {
        current += 20;
        return current;
      };
    })(),
    analysisNowIso: () => "2026-03-10T00:00:00.000Z",
    analysisWaitMs: async () => undefined
  });

  assert.equal(result.scenarios[0]?.status, "completed");
  if (result.scenarios[0]?.status === "completed") {
    assert.equal(result.scenarios[0].summary.budgetStops, 1);
    assert.equal(result.scenarios[0].repetitions[0]?.stoppedByBudget, true);
    assert.equal(result.scenarios[0].repetitions[0]?.finalStatus, "cancelled");
  }
});
