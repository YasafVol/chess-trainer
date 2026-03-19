import test from "node:test";
import assert from "node:assert/strict";
import type { Puzzle } from "../domain/types.js";
import type { ReplayData } from "../domain/gameReplay.js";
import {
  buildPuzzlePlaybackFens,
  buildRevealPlaybackMoves,
  buildSolveContinuationMoves,
  describePuzzleHint,
  filterPuzzles,
  resolveOriginalBlunderLabel
} from "./puzzleView.js";

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
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 2",
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

test("filterPuzzles keeps tab ordering and applies difficulty selection", () => {
  const rows = [
    createPuzzle({ id: "b1", classification: "blunder", ownership: "mine", difficulty: 2 }),
    createPuzzle({ id: "m1", classification: "mistake", ownership: "mine", difficulty: 2 }),
    createPuzzle({ id: "b2", classification: "blunder", ownership: "other", difficulty: 4 }),
    createPuzzle({ id: "b3", classification: "blunder", ownership: "mine", difficulty: 2 })
  ];

  assert.deepEqual(
    filterPuzzles(rows, "blunder", "mine", 2).map((puzzle) => puzzle.id),
    ["b1", "b3"]
  );
});

test("filterPuzzles applies ownership and difficulty filters conjunctively", () => {
  const rows = [
    createPuzzle({ id: "b1", classification: "blunder", ownership: "mine", difficulty: 2 }),
    createPuzzle({ id: "b2", classification: "blunder", ownership: "other", difficulty: 2 }),
    createPuzzle({ id: "b3", classification: "blunder", ownership: "mine", difficulty: 4 })
  ];

  assert.deepEqual(
    filterPuzzles(rows, "blunder", "other", "all").map((puzzle) => puzzle.id),
    ["b2"]
  );
  assert.deepEqual(
    filterPuzzles(rows, "blunder", "mine", 4).map((puzzle) => puzzle.id),
    ["b3"]
  );
});

test("resolveOriginalBlunderLabel prefers SAN from replay data and falls back to stored UCI", () => {
  const replayData: ReplayData = {
    fenPositions: ["fen-0", "fen-1", "fen-2", "fen-3"],
    moves: [
      { san: "e4", from: "e2", to: "e4" },
      { san: "e5", from: "e7", to: "e5" },
      { san: "Bc4", from: "f1", to: "c4" }
    ]
  };

  assert.equal(resolveOriginalBlunderLabel(createPuzzle(), replayData), "2. Bc4");
  assert.equal(resolveOriginalBlunderLabel(createPuzzle(), null), "f1e2");
});

test("playback helpers expose reveal and continuation move slices", () => {
  const puzzle = createPuzzle();

  assert.deepEqual(buildRevealPlaybackMoves(puzzle.solutionMoves), ["f1c4"]);
  assert.deepEqual(buildSolveContinuationMoves(puzzle.solutionMoves), ["g8f6"]);
});

test("buildPuzzlePlaybackFens returns a frame for each applied solution move", () => {
  const frames = buildPuzzlePlaybackFens(
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 2",
    ["f1c4", "g8f6"]
  );

  assert.equal(frames.length, 2);
  assert.match(frames[0] ?? "", /2B1P3/);
  assert.match(frames[0] ?? "", / b KQkq /);
  assert.match(frames[1] ?? "", /5n2/);
});

test("describePuzzleHint names the candidate piece and source square", () => {
  assert.equal(
    describePuzzleHint(
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 2",
      "f1c4"
    ),
    "Hint: look at the bishop on f1."
  );
});
