import test from "node:test";
import assert from "node:assert/strict";
import { buildEvalBarState, buildEvalGraphState, buildMoveAnnotation, normalizeEval } from "./analysisView.js";

test("normalizeEval clamps centipawn scores to the graph and bar range", () => {
  assert.equal(normalizeEval("cp", 1200), 1);
  assert.equal(normalizeEval("cp", -900), -1);
  assert.equal(normalizeEval("cp", 300), 0.5);
});

test("buildEvalBarState saturates mate scores to the winning side", () => {
  const state = buildEvalBarState({
    ply: 12,
    evaluationType: "mate",
    evaluation: 3,
    bestMoveUci: "e2e4",
    playedMoveUci: "e2e4",
    playedMoveEvaluationType: "mate",
    playedMoveEvaluation: 3
  });

  assert.equal(state.hasData, true);
  assert.equal(state.markerPercent, 0);
  assert.equal(state.fillSide, "white");
  assert.equal(state.scoreText, "M+3");
});

test("buildEvalBarState falls back to a neutral n/a state without analysis", () => {
  const state = buildEvalBarState(undefined);

  assert.deepEqual(state, {
    hasData: false,
    normalized: 0,
    markerPercent: 50,
    fillPercent: 0,
    fillTopPercent: 50,
    fillSide: "neutral",
    scoreText: "n/a"
  });
});

test("buildEvalGraphState builds points for saved plies and selects the active ply", () => {
  const graph = buildEvalGraphState(
    [
      {
        ply: 0,
        evaluationType: "cp",
        evaluation: 120,
        bestMoveUci: "e2e4",
        playedMoveUci: "e2e4",
        playedMoveEvaluationType: "cp",
        playedMoveEvaluation: 120
      },
      {
        ply: 4,
        evaluationType: "cp",
        evaluation: -300,
        bestMoveUci: "g1f3",
        playedMoveUci: "d2d4",
        playedMoveEvaluationType: "cp",
        playedMoveEvaluation: -430
      },
      {
        ply: 8,
        evaluationType: "mate",
        evaluation: -2,
        bestMoveUci: "d8h4",
        playedMoveUci: "g2g3",
        playedMoveEvaluationType: "cp",
        playedMoveEvaluation: -500
      }
    ],
    4
  );

  assert.equal(graph.points.length, 3);
  assert.equal(graph.points[0]?.x, 0);
  assert.equal(graph.points[1]?.x, 50);
  assert.equal(graph.points[2]?.x, 100);
  assert.equal(graph.selectedPoint?.ply, 4);
  assert.ok(/^M /.test(graph.path));
});

test("buildEvalGraphState collapses duplicate plies to the latest point", () => {
  const graph = buildEvalGraphState(
    [
      {
        ply: 17,
        evaluationType: "cp",
        evaluation: 40,
        bestMoveUci: "e2e4",
        playedMoveUci: "e2e4",
        playedMoveEvaluationType: "cp",
        playedMoveEvaluation: 40
      },
      {
        ply: 17,
        evaluationType: "cp",
        evaluation: 85,
        bestMoveUci: "d2d4",
        playedMoveUci: "d2d4",
        playedMoveEvaluationType: "cp",
        playedMoveEvaluation: 85
      }
    ],
    17
  );

  assert.equal(graph.points.length, 1);
  assert.equal(graph.selectedPoint?.scoreText, "+0.85");
});

test("buildMoveAnnotation maps best, inaccuracy, mistake, and blunder suffixes", () => {
  assert.equal(
    buildMoveAnnotation({
      ply: 0,
      evaluationType: "cp",
      evaluation: 40,
      bestMoveUci: "e2e4",
      playedMoveUci: "e2e4",
      playedMoveEvaluationType: "cp",
      playedMoveEvaluation: 40
    }).suffix,
    "!"
  );

  assert.equal(
    buildMoveAnnotation({
      ply: 0,
      evaluationType: "cp",
      evaluation: 120,
      bestMoveUci: "e2e4",
      playedMoveUci: "d2d4",
      playedMoveEvaluationType: "cp",
      playedMoveEvaluation: 60
    }).suffix,
    "?!"
  );

  assert.equal(
    buildMoveAnnotation({
      ply: 0,
      evaluationType: "cp",
      evaluation: 120,
      bestMoveUci: "e2e4",
      playedMoveUci: "d2d4",
      playedMoveEvaluationType: "cp",
      playedMoveEvaluation: -20
    }).suffix,
    "?"
  );

  assert.equal(
    buildMoveAnnotation({
      ply: 0,
      evaluationType: "cp",
      evaluation: 220,
      bestMoveUci: "e2e4",
      playedMoveUci: "a2a3",
      playedMoveEvaluationType: "cp",
      playedMoveEvaluation: -10
    }).suffix,
    "??"
  );
});
