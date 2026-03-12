import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import type { PlyAnalysis } from "../../../domain/types.js";
import { assertBenchmarkStoreIndex } from "../benchmarkDb.js";
import { listPlyAnalysisByRunId, savePlyAnalysis } from "./analysisRepo.js";
import {
  clearBenchmarkAnalysisData,
  listBenchmarkPlyAnalysisByRunId,
  saveBenchmarkPlyAnalysis
} from "./benchmarkAnalysisRepo.js";

function samplePly(input: { id: string; runId: string; gameId: string; ply: number; evaluation: number }): PlyAnalysis {
  return {
    id: input.id,
    userId: "user-1",
    runId: input.runId,
    gameId: input.gameId,
    ply: input.ply,
    fen: "startpos",
    evaluationType: "cp",
    evaluation: input.evaluation,
    depth: 16,
    pvUci: []
  };
}

test("benchmark analysis repo is isolated from the main analysis repo", async () => {
  const runId = `run-${crypto.randomUUID()}`;
  const gameId = `game-${crypto.randomUUID()}`;
  await clearBenchmarkAnalysisData();

  await savePlyAnalysis(samplePly({ id: `main-${crypto.randomUUID()}`, runId, gameId, ply: 1, evaluation: 10 }));
  await saveBenchmarkPlyAnalysis(samplePly({ id: `bench-${crypto.randomUUID()}`, runId, gameId, ply: 2, evaluation: 99 }));

  const mainPlies = await listPlyAnalysisByRunId(runId);
  const benchmarkPlies = await listBenchmarkPlyAnalysisByRunId(runId);

  assert.deepEqual(mainPlies.map((ply) => ply.ply), [1]);
  assert.deepEqual(benchmarkPlies.map((ply) => ply.ply), [2]);
});

test("clearBenchmarkAnalysisData removes only benchmark analysis entries", async () => {
  const runId = `run-${crypto.randomUUID()}`;
  const gameId = `game-${crypto.randomUUID()}`;

  await savePlyAnalysis(samplePly({ id: `main-${crypto.randomUUID()}`, runId, gameId, ply: 1, evaluation: 10 }));
  await saveBenchmarkPlyAnalysis(samplePly({ id: `bench-${crypto.randomUUID()}`, runId, gameId, ply: 2, evaluation: 99 }));
  await clearBenchmarkAnalysisData();

  const mainPlies = await listPlyAnalysisByRunId(runId);
  const benchmarkPlies = await listBenchmarkPlyAnalysisByRunId(runId);

  assert.equal(mainPlies.length, 1);
  assert.equal(benchmarkPlies.length, 0);
});

test("assertBenchmarkStoreIndex reports a readable missing-index error", () => {
  const fakeStore = {
    indexNames: {
      contains: () => false
    }
  } as unknown as Pick<IDBObjectStore, "indexNames">;

  assert.throws(
    () => assertBenchmarkStoreIndex(fakeStore, "analysisByPly", "by_runId"),
    /Benchmark IndexedDB missing index "by_runId" on "analysisByPly"/
  );
});
