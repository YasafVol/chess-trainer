import test from "node:test";
import assert from "node:assert/strict";
import { buildContinuousPuzzleQueue, rankContinuousPuzzleCandidate, removeContinuousPuzzle, requeueContinuousPuzzle } from "./continuousPuzzleSession.js";
import type { Puzzle, PuzzleAttempt } from "./types.js";

function createPuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: "puzzle-1",
    userId: "user-1",
    gameId: "game-1",
    source: {
      runId: "run-1",
      ply: 2,
      sourceGameHash: "hash-1"
    },
    classification: "blunder",
    ownership: "mine",
    fen: "fen",
    sideToMove: "w",
    evalSwing: -220,
    expectedBestMove: "f1c4",
    expectedLine: ["f1c4", "g8f6"],
    solutionMoves: ["f1c4", "g8f6"],
    playedBadMove: "f1e2",
    themes: ["tactics"],
    difficulty: 2,
    schedule: {
      repetition: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueAt: "2026-03-18T10:00:00.000Z",
      consecutiveFailures: 0
    },
    createdAt: "2026-03-18T10:00:00.000Z",
    updatedAt: "2026-03-18T10:00:00.000Z",
    ...overrides
  };
}

function createAttempt(overrides: Partial<PuzzleAttempt> = {}): PuzzleAttempt {
  return {
    id: `attempt-${crypto.randomUUID()}`,
    userId: "user-1",
    puzzleId: "puzzle-1",
    result: "success",
    quality: 5,
    elapsedMs: 1000,
    hintsUsed: 0,
    revealed: false,
    attemptedAt: "2026-03-19T10:00:00.000Z",
    ...overrides
  };
}

test("buildContinuousPuzzleQueue keeps due blunders ahead of non-due blunders and mistakes", () => {
  const queue = buildContinuousPuzzleQueue(
    [
      createPuzzle({ id: "blunder-due", classification: "blunder", schedule: { repetition: 0, intervalDays: 0, easeFactor: 2.5, dueAt: "2026-03-18T09:00:00.000Z", consecutiveFailures: 0 } }),
      createPuzzle({ id: "blunder-later", classification: "blunder", schedule: { repetition: 0, intervalDays: 0, easeFactor: 2.5, dueAt: "2026-03-25T09:00:00.000Z", consecutiveFailures: 0 } }),
      createPuzzle({ id: "mistake-due", classification: "mistake", schedule: { repetition: 0, intervalDays: 0, easeFactor: 2.5, dueAt: "2026-03-18T08:00:00.000Z", consecutiveFailures: 0 } })
    ],
    [],
    "2026-03-20T00:00:00.000Z"
  );

  assert.deepEqual(queue.blunder, ["blunder-due", "blunder-later"]);
  assert.deepEqual(queue.mistake, ["mistake-due"]);
});

test("buildContinuousPuzzleQueue uses weakness ranking before difficulty tie-breakers", () => {
  const puzzles = [
    createPuzzle({
      id: "weak-repeat",
      schedule: {
        repetition: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        dueAt: "2026-03-19T08:00:00.000Z",
        consecutiveFailures: 3
      },
      difficulty: 1
    }),
    createPuzzle({
      id: "weak-new",
      difficulty: 5,
      schedule: {
        repetition: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        dueAt: "2026-03-19T08:00:00.000Z",
        consecutiveFailures: 0
      }
    }),
    createPuzzle({
      id: "strong-known",
      difficulty: 4,
      schedule: {
        repetition: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        dueAt: "2026-03-19T08:00:00.000Z",
        consecutiveFailures: 0
      }
    })
  ];
  const attempts = [
    createAttempt({ puzzleId: "strong-known", result: "success", quality: 5 }),
    createAttempt({ puzzleId: "strong-known", result: "success", quality: 5, attemptedAt: "2026-03-19T11:00:00.000Z" }),
    createAttempt({ puzzleId: "weak-repeat", result: "fail", quality: 1, revealed: true })
  ];

  const queue = buildContinuousPuzzleQueue(puzzles, attempts, "2026-03-20T00:00:00.000Z");
  assert.deepEqual(queue.blunder, ["weak-repeat", "weak-new", "strong-known"]);
});

test("rankContinuousPuzzleCandidate treats unattempted puzzles as neutral 0.5 success rate", () => {
  const candidate = rankContinuousPuzzleCandidate(
    createPuzzle({ id: "fresh-puzzle" }),
    [],
    "2026-03-20T00:00:00.000Z"
  );

  assert.equal(candidate.overallSuccessRate, 0.5);
  assert.equal(candidate.attemptCount, 0);
});

test("requeueContinuousPuzzle reinserts a failed puzzle after the requested gap when possible", () => {
  assert.deepEqual(
    requeueContinuousPuzzle(["p1", "p2", "p3", "p4", "p5"], "p1", 3),
    ["p2", "p3", "p4", "p1", "p5"]
  );
});

test("requeueContinuousPuzzle appends to the phase end when fewer than the gap remain", () => {
  assert.deepEqual(
    requeueContinuousPuzzle(["p1", "p2"], "p1", 3),
    ["p2", "p1"]
  );
});

test("removeContinuousPuzzle removes solved puzzles from the session queue", () => {
  assert.deepEqual(removeContinuousPuzzle(["p1", "p2", "p3"], "p2"), ["p1", "p3"]);
});
