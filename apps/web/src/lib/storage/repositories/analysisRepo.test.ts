import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import type { AnalysisRun, PlyAnalysis } from "../../../domain/types.js";
import {
  getLatestAnalysisRunByGameId,
  hasCompletedAnalysisRunForGameId,
  listPlyAnalysisByRunId,
  saveAnalysisRun,
  savePlyAnalysis
} from "./analysisRepo.js";

function sampleRun(input: { id: string; gameId: string; createdAt: string; status?: AnalysisRun["status"] }): AnalysisRun {
  return {
    id: input.id,
    userId: "user-1",
    gameId: input.gameId,
    schemaVersion: 1,
    engineName: "Stockfish",
    engineVersion: "18",
    engineFlavor: "stockfish-18-single",
    options: {
      depth: 16,
      multiPV: 1,
      movetimeMs: 1200
    },
    status: input.status ?? "running",
    createdAt: input.createdAt
  };
}

function samplePly(input: { id: string; runId: string; gameId: string; ply: number }): PlyAnalysis {
  return {
    id: input.id,
    userId: "user-1",
    runId: input.runId,
    gameId: input.gameId,
    ply: input.ply,
    fen: "startpos",
    evaluationType: "cp",
    evaluation: 0,
    depth: 16,
    pvUci: []
  };
}

test("analysis repo returns latest run per game by createdAt", async () => {
  const gameId = `game-${crypto.randomUUID()}`;
  const older = sampleRun({
    id: `run-old-${crypto.randomUUID()}`,
    gameId,
    createdAt: "2026-03-05T10:00:00.000Z",
    status: "completed"
  });
  const latest = sampleRun({
    id: `run-new-${crypto.randomUUID()}`,
    gameId,
    createdAt: "2026-03-05T10:05:00.000Z",
    status: "running"
  });

  await saveAnalysisRun(older);
  await saveAnalysisRun(latest);

  const loaded = await getLatestAnalysisRunByGameId(gameId);
  assert.ok(loaded);
  assert.equal(loaded?.id, latest.id);
});

test("analysis repo reloads saved plies in ply order for a run", async () => {
  const gameId = `game-${crypto.randomUUID()}`;
  const runId = `run-${crypto.randomUUID()}`;
  const run = sampleRun({
    id: runId,
    gameId,
    createdAt: "2026-03-05T11:00:00.000Z"
  });

  await saveAnalysisRun(run);
  await savePlyAnalysis(samplePly({ id: `ply-${crypto.randomUUID()}`, runId, gameId, ply: 3 }));
  await savePlyAnalysis(samplePly({ id: `ply-${crypto.randomUUID()}`, runId, gameId, ply: 1 }));
  await savePlyAnalysis(samplePly({ id: `ply-${crypto.randomUUID()}`, runId, gameId, ply: 2 }));

  const reloaded = await listPlyAnalysisByRunId(runId);
  assert.deepEqual(
    reloaded.map((ply) => ply.ply),
    [1, 2, 3]
  );
});

test("analysis repo detects whether any completed run exists for a game", async () => {
  const gameId = `game-${crypto.randomUUID()}`;
  await saveAnalysisRun(sampleRun({
    id: `run-cancelled-${crypto.randomUUID()}`,
    gameId,
    createdAt: "2026-03-05T12:00:00.000Z",
    status: "cancelled"
  }));

  assert.equal(await hasCompletedAnalysisRunForGameId(gameId), false);

  await saveAnalysisRun(sampleRun({
    id: `run-completed-${crypto.randomUUID()}`,
    gameId,
    createdAt: "2026-03-05T12:05:00.000Z",
    status: "completed"
  }));

  assert.equal(await hasCompletedAnalysisRunForGameId(gameId), true);
});
