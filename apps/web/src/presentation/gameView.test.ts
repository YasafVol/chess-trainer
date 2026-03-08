import test from "node:test";
import assert from "node:assert/strict";
import { buildGameMetaChips, buildReplayPositionItems, resolveBoardPresentation } from "./gameView.js";
import type { ReplayData } from "../domain/gameReplay.js";

const replayData: ReplayData = {
  fenPositions: ["fen-start", "fen-after-e4", "fen-after-e5"],
  moves: [
    { san: "e4", from: "e2", to: "e4" },
    { san: "e5", from: "e7", to: "e5" }
  ]
};

test("buildReplayPositionItems exposes the start position as an active selectable item", () => {
  const items = buildReplayPositionItems(replayData, 0, null);

  assert.equal(items[0]?.label, "Start");
  assert.equal(items[0]?.ply, 0);
  assert.equal(items[0]?.isActive, true);
  assert.equal(items[1]?.label, "1. e4");
});

test("resolveBoardPresentation falls back to the initial position for ply zero", () => {
  const presentation = resolveBoardPresentation(replayData, 0, null);

  assert.deepEqual(presentation, {
    targetFen: "fen-start",
    highlightedSquares: []
  });
});

test("resolveBoardPresentation prioritizes manual exploration over replay state", () => {
  const presentation = resolveBoardPresentation(replayData, 1, "manual-fen");

  assert.deepEqual(presentation, {
    targetFen: "manual-fen",
    highlightedSquares: []
  });
});

test("buildGameMetaChips replaces raw hash text with concise metadata chips", () => {
  const chips = buildGameMetaChips(
    {
      headers: {
        Event: "Live Chess",
        Site: "Chess.com",
        Date: "2026.03.08",
        Result: "1-0",
        ECO: "B01"
      }
    },
    90
  );

  assert.deepEqual(
    chips.map((chip) => chip.text),
    ["Live Chess", "Chess.com", "2026.03.08", "1-0", "ECO B01", "90 plies"]
  );
});
