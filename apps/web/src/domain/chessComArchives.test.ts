import test from "node:test";
import assert from "node:assert/strict";
import {
  filterChessComArchiveMonthsAfter,
  filterChessComArchiveMonthsInRange,
  parseChessComArchiveUrl
} from "./chessComArchives.js";

test("parseChessComArchiveUrl extracts a sortable archive month", () => {
  assert.deepEqual(parseChessComArchiveUrl("https://api.chess.com/pub/player/hikaru/games/2026/03"), {
    id: "2026-03",
    year: 2026,
    month: 3,
    url: "https://api.chess.com/pub/player/hikaru/games/2026/03",
    label: new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      timeZone: "UTC"
    }).format(new Date(Date.UTC(2026, 2, 1)))
  });
});

test("filterChessComArchiveMonthsInRange returns the selected contiguous month range", () => {
  const months = [
    parseChessComArchiveUrl("https://api.chess.com/pub/player/hikaru/games/2026/01"),
    parseChessComArchiveUrl("https://api.chess.com/pub/player/hikaru/games/2026/02"),
    parseChessComArchiveUrl("https://api.chess.com/pub/player/hikaru/games/2026/03")
  ].filter((month): month is NonNullable<typeof month> => month !== null);

  assert.deepEqual(
    filterChessComArchiveMonthsInRange(months, "2026-02", "2026-03").map((month) => month.id),
    ["2026-02", "2026-03"]
  );
});

test("filterChessComArchiveMonthsAfter returns only newly available months", () => {
  const months = [
    parseChessComArchiveUrl("https://api.chess.com/pub/player/hikaru/games/2026/01"),
    parseChessComArchiveUrl("https://api.chess.com/pub/player/hikaru/games/2026/02"),
    parseChessComArchiveUrl("https://api.chess.com/pub/player/hikaru/games/2026/03")
  ].filter((month): month is NonNullable<typeof month> => month !== null);

  assert.deepEqual(
    filterChessComArchiveMonthsAfter(months, "2026-01").map((month) => month.id),
    ["2026-02", "2026-03"]
  );
});
