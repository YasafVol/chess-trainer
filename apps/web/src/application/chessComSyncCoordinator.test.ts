import test from "node:test";
import assert from "node:assert/strict";
import type { ChessComImportResult } from "../domain/types.js";
import { ChessComSyncCoordinator, CHESS_COM_SYNC_POLL_INTERVAL_MS } from "./chessComSyncCoordinator.js";

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createResult(overrides: Partial<ChessComImportResult> = {}): ChessComImportResult {
  return {
    requestedMonths: ["2026-03"],
    processedMonths: ["2026-03"],
    imported: 2,
    skippedDuplicates: 0,
    failedMonths: [],
    latestProcessedArchive: "2026-03",
    statusMessage: "Imported 2 game(s), skipped 0 duplicates across 1/1 month(s).",
    ...overrides
  };
}

test("ChessComSyncCoordinator runs a due sync on bootstrap and persists progress", async () => {
  const intervals: Array<() => void> = [];
  const saved: Array<{ lastSyncAt?: string; lastSuccessfulArchive?: string; lastStatus?: string }> = [];
  let syncCalls = 0;

  const coordinator = new ChessComSyncCoordinator({
    loadConfig: async () => ({
      username: "hikaru",
      enabled: true,
      interval: "daily",
      lastSyncAt: "2026-03-18T09:00:00.000Z",
      lastSuccessfulArchive: "2026-02"
    }),
    saveConfig: async (config) => {
      saved.push({
        lastSyncAt: config.lastSyncAt,
        lastSuccessfulArchive: config.lastSuccessfulArchive,
        lastStatus: config.lastStatus
      });
    },
    syncArchives: async () => {
      syncCalls += 1;
      return createResult();
    },
    setIntervalFn: (callback) => {
      intervals.push(callback as () => void);
      return intervals.length as ReturnType<typeof setInterval>;
    },
    clearIntervalFn: () => undefined,
    now: () => new Date("2026-03-20T09:00:00.000Z")
  });

  coordinator.ensureStarted();
  await flush();

  assert.equal(syncCalls, 1);
  assert.equal(saved.at(-1)?.lastSuccessfulArchive, "2026-03");
  assert.equal(saved.at(-1)?.lastSyncAt, "2026-03-20T09:00:00.000Z");
  assert.equal(intervals.length, 1);
  assert.equal(coordinator.getSnapshot().status, "Imported 2 game(s), skipped 0 duplicates across 1/1 month(s).");
});

test("ChessComSyncCoordinator does not auto-sync before the initial manual import establishes a cursor", async () => {
  let syncCalls = 0;

  const coordinator = new ChessComSyncCoordinator({
    loadConfig: async () => ({
      username: "hikaru",
      enabled: true,
      interval: "weekly"
    }),
    saveConfig: async () => undefined,
    syncArchives: async () => {
      syncCalls += 1;
      return createResult();
    },
    setIntervalFn: (callback) => CHESS_COM_SYNC_POLL_INTERVAL_MS as ReturnType<typeof setInterval>,
    clearIntervalFn: () => undefined,
    now: () => new Date("2026-03-20T09:00:00.000Z")
  });

  coordinator.ensureStarted();
  await flush();

  assert.equal(syncCalls, 0);
  assert.match(coordinator.getSnapshot().status, /Run a manual Chess.com import/);
});
