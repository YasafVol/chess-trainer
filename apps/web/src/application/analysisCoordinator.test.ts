import test from "node:test";
import assert from "node:assert/strict";
import type { AnalysisRun, GameRecord } from "../domain/types.js";
import { AnalysisCoordinator, BACKGROUND_ANALYSIS_INTERVAL_MS, type AnalysisCoordinatorDeps } from "./analysisCoordinator.js";

function createGame(id: string): GameRecord {
  return {
    id,
    schemaVersion: 1,
    userId: "yasafvolinsky",
    hash: `hash-${id}`,
    pgn: `[Event "Test"]\n[White "yasafvolinsky"]\n[Black "Opponent"]\n\n1. e4 e5 2. Nf3 Nc6 *`,
    headers: {
      White: "yasafvolinsky",
      Black: "Opponent"
    },
    initialFen: "startpos",
    movesUci: ["e2e4", "e7e5", "g1f3", "b8c6"],
    source: "paste",
    createdAt: "2026-03-19T08:00:00.000Z",
    updatedAt: "2026-03-19T08:00:00.000Z"
  };
}

function createRun(gameId: string, status: AnalysisRun["status"]): AnalysisRun {
  return {
    id: `run-${gameId}-${status}-${crypto.randomUUID()}`,
    userId: "yasafvolinsky",
    gameId,
    schemaVersion: 1,
    engineName: "Stockfish",
    engineVersion: "18",
    engineFlavor: "stockfish-18-lite-single",
    options: {
      depth: 16,
      multiPV: 1,
      movetimeMs: 1200,
      foregroundBudgetMs: 6000
    },
    status,
    createdAt: "2026-03-19T08:00:00.000Z",
    completedAt: "2026-03-19T08:01:00.000Z"
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createHarness(overrides: Partial<AnalysisCoordinatorDeps> = {}) {
  const intervals: Array<() => void> = [];
  const calls: string[] = [];
  const generated: Array<{ runId: string; gameId: string }> = [];
  let cancelled = 0;
  const games = overrides.listGames ? [] : [createGame("game-1"), createGame("game-2")];

  const deps: AnalysisCoordinatorDeps = {
    createEngineClient: () => ({
      init: async () => undefined,
      analyzePosition: async () => ({
        type: "engine:result" as const,
        payload: {
          bestMoveUci: "e2e4",
          evaluationType: "cp" as const,
          evaluation: 32,
          depth: 16,
          pvUci: ["e2e4"]
        }
      }),
      cancel: async () => {
        cancelled += 1;
      }
    }),
    runGameAnalysis: async (args) => {
      calls.push(args.game.id);
      return {
        finalRun: createRun(args.game.id, "completed"),
        done: args.game.movesUci.length,
        retriesUsed: 0,
        stoppedByBudget: false
      };
    },
    listGames: async () => games,
    getGame: async (gameId) => games.find((game) => game.id === gameId) ?? null,
    hasCompletedRun: async () => false,
    saveRun: async () => undefined,
    savePly: async () => undefined,
    generatePuzzlesForRun: async (runId, gameId) => {
      generated.push({ runId, gameId });
      return 2;
    },
    parseReplayData: () => ({
      fenPositions: ["fen-0", "fen-1", "fen-2", "fen-3", "fen-4"],
      moves: [
        { san: "e4", from: "e2", to: "e4" },
        { san: "e5", from: "e7", to: "e5" },
        { san: "Nf3", from: "g1", to: "f3" },
        { san: "Nc6", from: "b8", to: "c6" }
      ]
    }),
    chooseEngineFlavor: () => "stockfish-18-lite-single",
    loadConfig: async () => ({
      enabled: true,
      intervalMs: BACKGROUND_ANALYSIS_INTERVAL_MS
    }),
    saveConfig: async () => undefined,
    setIntervalFn: (callback) => {
      intervals.push(callback as () => void);
      return intervals.length as ReturnType<typeof setInterval>;
    },
    clearIntervalFn: () => undefined,
    ...overrides
  };

  return {
    coordinator: new AnalysisCoordinator(deps),
    intervals,
    calls,
    generated,
    getCancelled: () => cancelled
  };
}

test("analysis coordinator starts background analysis on bootstrap when an eligible game exists", async () => {
  const harness = createHarness();

  harness.coordinator.ensureStarted();
  await flush();

  assert.deepEqual(harness.calls, ["game-1"]);
  assert.equal(harness.generated.length, 1);
  assert.equal(harness.coordinator.getSnapshot().running, false);
  assert.match(harness.coordinator.getSnapshot().status, /Background analysis completed/);
});

test("analysis coordinator skips interval scans while analysis is already running", async () => {
  const deferred = createDeferred<Awaited<ReturnType<AnalysisCoordinatorDeps["runGameAnalysis"]>>>();
  const harness = createHarness({
    runGameAnalysis: async (args) => {
      harness.calls.push(args.game.id);
      return deferred.promise;
    }
  });

  harness.coordinator.ensureStarted();
  await flush();
  assert.deepEqual(harness.calls, ["game-1"]);

  await harness.intervals[0]?.();
  await flush();
  assert.deepEqual(harness.calls, ["game-1"]);

  deferred.resolve({
    finalRun: createRun("game-1", "completed"),
    done: 4,
    retriesUsed: 0,
    stoppedByBudget: false
  });
  await flush();
});

test("analysis coordinator cancels background work and starts the requested foreground game", async () => {
  const deferred = createDeferred<Awaited<ReturnType<AnalysisCoordinatorDeps["runGameAnalysis"]>>>();
  let runCount = 0;
  const harness = createHarness({
    runGameAnalysis: async (args) => {
      harness.calls.push(args.game.id);
      runCount += 1;
      if (runCount === 1) {
        return deferred.promise;
      }
      return {
        finalRun: createRun(args.game.id, "completed"),
        done: 4,
        retriesUsed: 0,
        stoppedByBudget: false
      };
    }
  });

  harness.coordinator.ensureStarted();
  await flush();
  assert.deepEqual(harness.calls, ["game-1"]);

  await harness.coordinator.requestForegroundAnalysis("game-2");
  assert.equal(harness.getCancelled(), 1);
  assert.deepEqual(harness.calls, ["game-1"]);

  deferred.resolve({
    finalRun: createRun("game-1", "cancelled"),
    done: 1,
    retriesUsed: 0,
    stoppedByBudget: false
  });
  await flush();

  assert.deepEqual(harness.calls, ["game-1", "game-2"]);
  assert.equal(harness.coordinator.getSnapshot().activeGameId, null);
});

test("analysis coordinator retries an interrupted background game on a later tick until completed", async () => {
  let completed = false;
  let runCount = 0;
  const harness = createHarness({
    hasCompletedRun: async () => completed,
    runGameAnalysis: async (args) => {
      harness.calls.push(args.game.id);
      runCount += 1;
      if (runCount === 1) {
        return {
          finalRun: createRun(args.game.id, "cancelled"),
          done: 1,
          retriesUsed: 0,
          stoppedByBudget: false
        };
      }

      completed = true;
      return {
        finalRun: createRun(args.game.id, "completed"),
        done: 4,
        retriesUsed: 0,
        stoppedByBudget: false
      };
    }
  });

  harness.coordinator.ensureStarted();
  await flush();
  assert.deepEqual(harness.calls, ["game-1"]);

  await harness.intervals[0]?.();
  await flush();

  assert.deepEqual(harness.calls, ["game-1", "game-1"]);
});

test("analysis coordinator generates puzzles after a completed background run", async () => {
  const harness = createHarness({
    runGameAnalysis: async (args) => {
      harness.calls.push(args.game.id);
      return {
        finalRun: createRun(args.game.id, "completed"),
        done: 4,
        retriesUsed: 0,
        stoppedByBudget: false
      };
    }
  });

  harness.coordinator.ensureStarted();
  await flush();

  assert.deepEqual(harness.generated.map((entry) => entry.gameId), ["game-1"]);
});

test("analysis coordinator does not start background analysis when lazy analysis is disabled", async () => {
  const harness = createHarness({
    loadConfig: async () => ({
      enabled: false,
      intervalMs: BACKGROUND_ANALYSIS_INTERVAL_MS
    })
  });

  harness.coordinator.ensureStarted();
  await flush();

  assert.deepEqual(harness.calls, []);
  assert.equal(harness.coordinator.getSnapshot().config.enabled, false);
});

test("analysis coordinator persists updated lazy-analysis settings", async () => {
  const saved: Array<{ enabled: boolean; intervalMs: number }> = [];
  const harness = createHarness({
    hasCompletedRun: async () => true,
    saveConfig: async (config) => {
      saved.push(config);
    }
  });

  harness.coordinator.ensureStarted();
  await flush();
  await harness.coordinator.updateConfig({
    enabled: false,
    intervalMs: 45000
  });

  assert.deepEqual(saved, [{ enabled: false, intervalMs: 45000 }]);
  assert.deepEqual(harness.coordinator.getSnapshot().config, {
    enabled: false,
    intervalMs: 45000
  });
});
