import test from "node:test";
import assert from "node:assert/strict";
import { derivePuzzleOwnership, normalizePuzzleRecord, normalizePuzzleSolutionMoves } from "./puzzles.js";

test("normalizePuzzleSolutionMoves prefers canonical solutionMoves when present", () => {
  assert.deepEqual(
    normalizePuzzleSolutionMoves({
      expectedBestMove: "f1c4",
      expectedLine: ["f1c4", "g8f6"],
      solutionMoves: ["f1b5", "a7a6"]
    }),
    ["f1b5", "a7a6"]
  );
});

test("normalizePuzzleSolutionMoves accepts legacy UCI expectedLine and falls back to best move", () => {
  assert.deepEqual(
    normalizePuzzleSolutionMoves({
      expectedBestMove: "f1c4",
      expectedLine: ["f1c4", "g8f6"]
    }),
    ["f1c4", "g8f6"]
  );

  assert.deepEqual(
    normalizePuzzleSolutionMoves({
      expectedBestMove: "f1c4",
      expectedLine: ["Bc4", "Nf6"]
    }),
    ["f1c4"]
  );
});

test("normalizePuzzleRecord adds solutionMoves for legacy puzzle records", () => {
  const puzzle = normalizePuzzleRecord({
    id: "puzzle-1",
    expectedBestMove: "f1c4",
    expectedLine: ["f1c4", "g8f6"]
  });

  assert.deepEqual(puzzle.solutionMoves, ["f1c4", "g8f6"]);
  assert.equal(puzzle.ownership, "other");
});

test("derivePuzzleOwnership marks matching white-side mistakes as mine", () => {
  assert.equal(
    derivePuzzleOwnership({
      whiteName: " YasafVolinsky ",
      blackName: "Opponent",
      username: "yasafvolinsky",
      badMoveSide: "w"
    }),
    "mine"
  );
});

test("derivePuzzleOwnership marks matching black-side mistakes as mine", () => {
  assert.equal(
    derivePuzzleOwnership({
      whiteName: "Opponent",
      blackName: "YASAFVOLINSKY",
      username: "yasafvolinsky",
      badMoveSide: "b"
    }),
    "mine"
  );
});

test("derivePuzzleOwnership returns other for opponent or unmatched names", () => {
  assert.equal(
    derivePuzzleOwnership({
      whiteName: "yasafvolinsky",
      blackName: "Opponent",
      username: "yasafvolinsky",
      badMoveSide: "b"
    }),
    "other"
  );

  assert.equal(
    derivePuzzleOwnership({
      whiteName: "Someone Else",
      blackName: "Opponent",
      username: "yasafvolinsky",
      badMoveSide: "w"
    }),
    "other"
  );
});
