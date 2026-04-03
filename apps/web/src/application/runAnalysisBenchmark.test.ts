import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisBenchmarkScenarios, type AnalysisBenchmarkScenario } from "../domain/analysisBenchmark.js";
import type { GameRecord, PlyAnalysis, AnalysisRun } from "../domain/types.js";
import { runAnalysisBenchmark, type AnalysisBenchmarkEngine } from "./runAnalysisBenchmark.js";
import type { AnalyzePositionInput } from "./runGameAnalysis.js";

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
  const scenarios: AnalysisBenchmarkScenario[] = [
    buildAnalysisBenchmarkScenarios()[0]!,
    {
      id: "engine-single",
      label: "Single Engine",
      description: "Use the heavier single-thread engine build if it initializes successfully.",
      comparisonMode: "primary",
      settings: {
        engineFlavor: "stockfish-18-single",
        depth: 16,
        movetimeMs: 1200,
        multiPV: 1
      }
    }
  ];
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
  if (result.scenarios[1]?.status === "skipped") {
    assert.equal(result.scenarios[1].failedStep, "engine-init");
    assert.equal(result.scenarios[1].failedRepetition, 1);
  }
});

test("runAnalysisBenchmark counts safety-stopped runs in the scenario summary", async () => {
  const budgetScenario: AnalysisBenchmarkScenario = {
    id: "budget-stop",
    label: "Safety stop",
    description: "Forces the derived runtime safety budget to trip.",
    comparisonMode: "primary",
    settings: {
      engineFlavor: "stockfish-18-lite-single",
      depth: 16,
      movetimeMs: 1200,
      multiPV: 1
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
        current += 4000;
        return current;
      };
    })(),
    analysisNowIso: () => "2026-03-10T00:00:00.000Z",
    analysisWaitMs: async () => undefined
  });

  assert.equal(result.scenarios[0]?.status, "completed");
  if (result.scenarios[0]?.status === "completed") {
    assert.equal(result.scenarios[0].summary.safetyStops, 1);
    assert.equal(result.scenarios[0].repetitions[0]?.stoppedByBudget, true);
    assert.equal(result.scenarios[0].repetitions[0]?.finalStatus, "cancelled");
  }
});

test("runAnalysisBenchmark reports first-scenario storage clear failures with the failing step", async () => {
  const result = await runAnalysisBenchmark({
    game: sampleGame(["e2e4"]),
    fenPositions: ["start", "after-e4"],
    moveSanList: ["e4"],
    totalPlies: 1,
    scenarios: [buildAnalysisBenchmarkScenarios()[0]],
    repetitions: 2,
    createEngine: createEngineFactory({}),
    saveRun: async () => undefined,
    savePly: async () => undefined,
    listPlyAnalysisByRunId: async () => [],
    clearStorage: async () => {
      throw { name: "QuotaExceededError", message: "DB full" };
    }
  });

  assert.equal(result.scenarios[0]?.status, "failed");
  if (result.scenarios[0]?.status === "failed") {
    assert.equal(result.scenarios[0].failedStep, "clear-storage");
    assert.equal(result.scenarios[0].failedRepetition, 1);
    assert.equal(result.scenarios[0].reason, "QuotaExceededError: DB full");
  }
});

test("runAnalysisBenchmark preserves completed scenarios when a later savePly failure occurs", async () => {
  const scenarios = buildAnalysisBenchmarkScenarios().filter((scenario) =>
    scenario.id === "baseline" || scenario.id === "depth-12"
  );
  let clearCalls = 0;

  const result = await runAnalysisBenchmark({
    game: sampleGame(["e2e4"]),
    fenPositions: ["start", "after-e4"],
    moveSanList: ["e4"],
    totalPlies: 1,
    scenarios,
    repetitions: 1,
    createEngine: createEngineFactory({}),
    saveRun: async () => undefined,
    savePly: async () => {
      if (clearCalls > 1) {
        throw new Error("write blocked");
      }
    },
    listPlyAnalysisByRunId: async () => [],
    clearStorage: async () => {
      clearCalls += 1;
    },
    createId: (() => {
      let i = 0;
      return () => `id-${++i}`;
    })()
  });

  assert.deepEqual(result.scenarios.map((scenario) => scenario.status), ["completed", "failed"]);
  if (result.scenarios[1]?.status === "failed") {
    assert.equal(result.scenarios[1].failedStep, "save-ply");
    assert.equal(result.scenarios[1].failedRepetition, 1);
    assert.ok(result.scenarios[1].reason.includes("savePly failed for scenario"));
  }
});

test("runAnalysisBenchmark preserves engine method binding for analyzePosition", async () => {
  const engineFactory = () => ({
    calls: 0,
    init: async () => undefined,
    async analyzePosition(input: AnalyzePositionInput) {
      this.calls += 1;
      return {
        type: "engine:result" as const,
        payload: {
          bestMoveUci: input.searchMovesUci?.[0] ?? "e2e4",
          evaluationType: "cp" as const,
          evaluation: 12,
          depth: input.depth,
          nodes: 1000,
          nps: 2000,
          pvUci: ["e2e4", "e7e5"]
        }
      };
    },
    terminate: () => undefined
  });

  const result = await runAnalysisBenchmark({
    game: sampleGame(["e2e4"]),
    fenPositions: ["start", "after-e4"],
    moveSanList: ["e4"],
    totalPlies: 1,
    scenarios: [buildAnalysisBenchmarkScenarios()[0]],
    repetitions: 1,
    createEngine: engineFactory,
    saveRun: async () => undefined,
    savePly: async () => undefined,
    listPlyAnalysisByRunId: async () => [],
    clearStorage: async () => undefined
  });

  assert.equal(result.scenarios[0]?.status, "completed");
});
