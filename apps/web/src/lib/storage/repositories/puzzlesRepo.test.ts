import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import type { Puzzle, PuzzleAttempt } from "../../../domain/types.js";
import { listPuzzleAttempts, listPuzzleAttemptsByPuzzleId, savePuzzle, savePuzzleAttempt } from "./puzzlesRepo.js";

function samplePuzzle(id: string): Puzzle {
  return {
    id,
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
    updatedAt: "2026-03-18T10:00:00.000Z"
  };
}

function sampleAttempt(overrides: Partial<PuzzleAttempt> = {}): PuzzleAttempt {
  return {
    id: `attempt-${crypto.randomUUID()}`,
    userId: "user-1",
    puzzleId: "puzzle-1",
    result: "success",
    quality: 5,
    elapsedMs: 1000,
    hintsUsed: 0,
    revealed: false,
    attemptedAt: "2026-03-18T10:00:00.000Z",
    ...overrides
  };
}

test("puzzles repo lists all attempts across the bank in attemptedAt order", async () => {
  await savePuzzle(samplePuzzle("puzzle-1"));
  await savePuzzle(samplePuzzle("puzzle-2"));
  await savePuzzleAttempt(sampleAttempt({ puzzleId: "puzzle-1", attemptedAt: "2026-03-18T11:00:00.000Z" }));
  await savePuzzleAttempt(sampleAttempt({ puzzleId: "puzzle-2", attemptedAt: "2026-03-18T09:00:00.000Z" }));

  const attempts = await listPuzzleAttempts();
  assert.deepEqual(
    attempts.map((attempt) => attempt.puzzleId),
    ["puzzle-2", "puzzle-1"]
  );
});

test("puzzles repo still lists attempts by puzzle id in attemptedAt order", async () => {
  await savePuzzle(samplePuzzle("puzzle-by-id"));
  await savePuzzleAttempt(sampleAttempt({ puzzleId: "puzzle-by-id", attemptedAt: "2026-03-18T12:00:00.000Z" }));
  await savePuzzleAttempt(sampleAttempt({ puzzleId: "puzzle-by-id", attemptedAt: "2026-03-18T08:00:00.000Z" }));

  const attempts = await listPuzzleAttemptsByPuzzleId("puzzle-by-id");
  assert.deepEqual(
    attempts.map((attempt) => attempt.attemptedAt),
    ["2026-03-18T08:00:00.000Z", "2026-03-18T12:00:00.000Z"]
  );
});
