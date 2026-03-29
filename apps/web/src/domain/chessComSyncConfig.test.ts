import test from "node:test";
import assert from "node:assert/strict";
import {
  CHESS_COM_SYNC_CONFIG_DEFAULTS,
  isChessComSyncDue,
  normalizeChessComSyncConfig,
  normalizeChessComUsername,
  validateChessComSyncConfig
} from "./chessComSyncConfig.js";

test("normalizeChessComUsername trims and lowercases the configured username", () => {
  assert.equal(normalizeChessComUsername("  Hikaru  "), "hikaru");
});

test("normalizeChessComSyncConfig falls back to defaults", () => {
  assert.deepEqual(normalizeChessComSyncConfig(undefined), {
    ...CHESS_COM_SYNC_CONFIG_DEFAULTS,
    lastSyncAt: undefined,
    lastSuccessfulArchive: undefined,
    lastStatus: undefined
  });
});

test("validateChessComSyncConfig rejects enabled sync without a username", () => {
  assert.equal(
    validateChessComSyncConfig({
      ...CHESS_COM_SYNC_CONFIG_DEFAULTS,
      enabled: true
    }),
    "Chess.com username is required to enable sync."
  );
});

test("isChessComSyncDue handles daily and weekly cadence correctly", () => {
  assert.equal(
    isChessComSyncDue(
      {
        username: "hikaru",
        enabled: true,
        interval: "daily",
        lastSyncAt: "2026-03-19T09:00:00.000Z"
      },
      new Date("2026-03-20T09:00:00.000Z")
    ),
    true
  );

  assert.equal(
    isChessComSyncDue(
      {
        username: "hikaru",
        enabled: true,
        interval: "weekly",
        lastSyncAt: "2026-03-14T09:00:00.000Z"
      },
      new Date("2026-03-20T09:00:00.000Z")
    ),
    false
  );
});
