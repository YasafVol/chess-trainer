import test from "node:test";
import assert from "node:assert/strict";
import { runGameAnalysis } from "./runGameAnalysis.js";
import type { AnalysisRun, GameRecord, PlyAnalysis } from "../domain/types.js";

function sampleGame(movesUci: string[]): GameRecord {
  return {
    id: "game-1",
    schemaVersion: 1,
    hash: "abc123",
    pgn: "1. e4 e5 *",
    headers: {},
    initialFen: "startpos",
    movesUci,
    createdAt: "2026-03-05T10:00:00.000Z",
    updatedAt: "2026-03-05T10:00:00.000Z"
  };
}

function resultMessage() {
  return {
    type: "engine:result" as const,
    payload: {
      bestMoveUci: "e2e4",
      evaluationType: "cp" as const,
      evaluation: 12,
      depth: 16,
      nodes: 1000,
      nps: 2000,
      pvUci: ["e2e4", "e7e5"]
    }
  };
}

test("runGameAnalysis retries once with lowered depth after timeout-like error", async () => {
  const calls: number[] = [];
  const savedRuns: AnalysisRun[] = [];
  const savedPlies: PlyAnalysis[] = [];
  let attempt = 0;

  const output = await runGameAnalysis({
    game: sampleGame(["e2e4"]),
    fenPositions: ["start", "after-e4"],
    moveSanList: ["e4"],
    engineFlavor: "stockfish-18-single",
    analyzePosition: async (input) => {
      calls.push(input.depth);
      attempt += 1;
      if (attempt === 1) {
        throw new Error("Timed out waiting for engine response");
      }
      return resultMessage();
    },
    saveRun: async (run) => {
      savedRuns.push(run);
    },
    savePly: async (ply) => {
      savedPlies.push(ply);
    },
    isCancelRequested: () => false,
    markCancelRequested: () => undefined,
    waitMs: async () => undefined,
    createId: (() => {
      let i = 0;
      return () => `id-${++i}`;
    })()
  });

  assert.deepEqual(calls, [16, 14, 16]);
  assert.equal(output.retriesUsed, 1);
  assert.equal(output.finalRun.status, "completed");
  assert.equal(output.finalRun.error, "Completed with 1 retry.");
  assert.equal(savedRuns.length, 2);
  assert.equal(savedPlies.length, 2);
});

test("runGameAnalysis finalizes as cancelled when engine emits cancelled", async () => {
  const savedRuns: AnalysisRun[] = [];
  const savedPlies: PlyAnalysis[] = [];
  let cancelMarked = 0;

  const output = await runGameAnalysis({
    game: sampleGame(["e2e4"]),
    fenPositions: ["start", "after-e4"],
    moveSanList: ["e4"],
    engineFlavor: "stockfish-18-single",
    analyzePosition: async () => ({ type: "engine:cancelled" as const }),
    saveRun: async (run) => {
      savedRuns.push(run);
    },
    savePly: async (ply) => {
      savedPlies.push(ply);
    },
    isCancelRequested: () => cancelMarked > 0,
    markCancelRequested: () => {
      cancelMarked += 1;
    }
  });

  assert.equal(cancelMarked, 1);
  assert.equal(output.finalRun.status, "cancelled");
  assert.equal(savedPlies.length, 0);
  assert.equal(savedRuns.length, 2);
});

test("runGameAnalysis stops by runtime budget and marks run cancelled with budget message", async () => {
  const savedRuns: AnalysisRun[] = [];
  let currentMs = 0;
  const nowMs = () => {
    currentMs += 20;
    return currentMs;
  };
  let cancelled = false;

  const output = await runGameAnalysis({
    game: sampleGame(["e2e4", "e7e5", "g1f3"]),
    fenPositions: ["start", "p1", "p2", "p3"],
    moveSanList: ["e4", "e5", "Nf3"],
    engineFlavor: "stockfish-18-single",
    analyzePosition: async () => resultMessage(),
    saveRun: async (run) => {
      savedRuns.push(run);
    },
    savePly: async () => undefined,
    isCancelRequested: () => cancelled,
    markCancelRequested: () => {
      cancelled = true;
    },
    nowMs,
    nowIso: () => "2026-03-05T10:00:00.000Z",
    policy: {
      defaultDepth: 16,
      defaultMultiPV: 1,
      softPerPositionMaxMs: 1200,
      foregroundBudgetMs: 50
    }
  });

  assert.equal(output.stoppedByBudget, true);
  assert.equal(output.finalRun.status, "cancelled");
  assert.equal(output.finalRun.error, "Stopped after foreground runtime budget; rerun to continue refining.");
  assert.equal(savedRuns.length, 2);
});
