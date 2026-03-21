import test from "node:test";
import assert from "node:assert/strict";
import type { ChessComArchiveMonth, GameRecord, ImportPreviewGame } from "../domain/types.js";
import { importChessComArchiveRange, syncChessComArchives } from "./chessComImport.js";

function createArchive(id: string): ChessComArchiveMonth {
  const [year, month] = id.split("-").map(Number);
  return {
    id,
    year,
    month,
    url: `https://api.chess.com/pub/player/hikaru/games/${year}/${String(month).padStart(2, "0")}`,
    label: `${id}`
  };
}

function createStoredGame(hash: string): GameRecord {
  return {
    id: `game-${hash}`,
    schemaVersion: 1,
    userId: "yasafvolinsky",
    hash,
    pgn: `[Event "Stored"]\n[White "hikaru"]\n[Black "opponent"]\n\n1. e4 e5 *`,
    headers: { White: "hikaru", Black: "opponent" },
    initialFen: "startpos",
    movesUci: ["e2e4", "e7e5"],
    source: "chesscom",
    createdAt: "2026-03-20T09:00:00.000Z",
    updatedAt: "2026-03-20T09:00:00.000Z"
  };
}

const JAN_PGN = `[Event "Jan Game"]\n[White "hikaru"]\n[Black "opponent"]\n\n1. e4 e5 *`;
const FEB_PGN = `[Event "Feb Game"]\n[White "hikaru"]\n[Black "opponent"]\n\n1. d4 d5 *`;

test("importChessComArchiveRange imports a bounded archive range and skips duplicates on reruns", async () => {
  const archives = [createArchive("2026-01"), createArchive("2026-02"), createArchive("2026-03")];
  const storedGames: GameRecord[] = [];

  const result = await importChessComArchiveRange(
    {
      username: "Hikaru",
      startMonthId: "2026-01",
      endMonthId: "2026-02"
    },
    {
      listArchiveMonths: async () => archives,
      fetchArchivePgn: async (_username, archive) => archive.id === "2026-01" ? JAN_PGN : FEB_PGN,
      listGames: async () => storedGames,
      importPreviews: async (previews: ImportPreviewGame[]) => {
        const imported = previews.filter((preview) => preview.selected && !preview.duplicateOfGameId);
        for (const preview of imported) {
          storedGames.push(createStoredGame(preview.hash));
        }
        return {
          imported: imported.length,
          skippedDuplicates: previews.filter((preview) => !!preview.duplicateOfGameId).length,
          skippedInvalid: 0,
          gameIds: imported.map((preview) => preview.hash)
        };
      }
    }
  );

  assert.deepEqual(result.requestedMonths, ["2026-01", "2026-02"]);
  assert.deepEqual(result.processedMonths, ["2026-01", "2026-02"]);
  assert.equal(result.imported, 2);

  const rerun = await importChessComArchiveRange(
    {
      username: "hikaru",
      startMonthId: "2026-01",
      endMonthId: "2026-02"
    },
    {
      listArchiveMonths: async () => archives,
      fetchArchivePgn: async (_username, archive) => archive.id === "2026-01" ? JAN_PGN : FEB_PGN,
      listGames: async () => storedGames,
      importPreviews: async (previews: ImportPreviewGame[]) => ({
        imported: previews.filter((preview) => preview.selected && !preview.duplicateOfGameId).length,
        skippedDuplicates: previews.filter((preview) => !!preview.duplicateOfGameId).length,
        skippedInvalid: 0,
        gameIds: []
      })
    }
  );

  assert.equal(rerun.imported, 0);
  assert.equal(rerun.skippedDuplicates, 2);
});

test("syncChessComArchives imports only months after the saved archive cursor", async () => {
  const archives = [createArchive("2026-01"), createArchive("2026-02"), createArchive("2026-03")];
  const requested: string[] = [];

  const result = await syncChessComArchives(
    {
      username: "hikaru",
      enabled: true,
      interval: "daily",
      lastSuccessfulArchive: "2026-01"
    },
    {
      listArchiveMonths: async () => archives,
      fetchArchivePgn: async (_username, archive) => {
        requested.push(archive.id);
        return archive.id === "2026-02" ? FEB_PGN : JAN_PGN;
      },
      listGames: async () => [],
      importPreviews: async (previews: ImportPreviewGame[]) => ({
        imported: previews.filter((preview) => preview.selected && !preview.duplicateOfGameId).length,
        skippedDuplicates: previews.filter((preview) => !!preview.duplicateOfGameId).length,
        skippedInvalid: 0,
        gameIds: previews.map((preview) => preview.hash)
      })
    }
  );

  assert.deepEqual(requested, ["2026-02", "2026-03"]);
  assert.deepEqual(result.requestedMonths, ["2026-02", "2026-03"]);
  assert.equal(result.latestProcessedArchive, "2026-03");
});
