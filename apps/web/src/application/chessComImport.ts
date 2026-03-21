import { filterChessComArchiveMonthsAfter, filterChessComArchiveMonthsInRange } from "../domain/chessComArchives.js";
import { normalizeChessComUsername } from "../domain/chessComSyncConfig.js";
import type { ChessComArchiveMonth, ChessComImportResult, ChessComSyncConfig, GameRecord, ImportBatchResult } from "../domain/types.js";
import { fetchChessComArchiveMonths, fetchChessComArchivePgn } from "../lib/chessComApi.js";
import { runtimeGateway } from "../lib/runtimeGateway.js";
import { buildImportPreviews, importSelectedPreviews } from "./importGames.js";

export type ChessComImportDeps = {
  listArchiveMonths: (username: string) => Promise<ChessComArchiveMonth[]>;
  fetchArchivePgn: (username: string, archive: ChessComArchiveMonth) => Promise<string>;
  listGames: () => Promise<GameRecord[]>;
  importPreviews: (previews: Awaited<ReturnType<typeof buildImportPreviews>>) => Promise<ImportBatchResult>;
};

function defaultDeps(): ChessComImportDeps {
  return {
    listArchiveMonths: fetchChessComArchiveMonths,
    fetchArchivePgn: fetchChessComArchivePgn,
    listGames: () => runtimeGateway.listGames(),
    importPreviews: importSelectedPreviews
  };
}

function describeImportResult(result: ChessComImportResult): string {
  const failed = result.failedMonths.length > 0
    ? ` Failed months: ${result.failedMonths.join(", ")}.`
    : "";
  return `Imported ${result.imported} game(s), skipped ${result.skippedDuplicates} duplicates across ${result.processedMonths.length}/${result.requestedMonths.length} month(s).${failed}`;
}

async function importArchiveMonths(
  username: string,
  months: ChessComArchiveMonth[],
  deps: ChessComImportDeps
): Promise<ChessComImportResult> {
  const requestedMonths = months.map((month) => month.id);
  const processedMonths: string[] = [];
  const failedMonths: string[] = [];
  let imported = 0;
  let skippedDuplicates = 0;

  for (const archive of months) {
    try {
      const rawPgn = await deps.fetchArchivePgn(username, archive);
      const existingGames = await deps.listGames();
      const previews = await buildImportPreviews({
        rawInput: rawPgn,
        source: "chesscom",
        existingGames
      });
      const result = await deps.importPreviews(previews);
      imported += result.imported;
      skippedDuplicates += result.skippedDuplicates;
      processedMonths.push(archive.id);
    } catch (error) {
      console.warn("[chessComImport] archive import failed", {
        username,
        archive: archive.id,
        error
      });
      failedMonths.push(archive.id);
    }
  }

  const latestProcessedArchive = processedMonths.length > 0 ? processedMonths[processedMonths.length - 1] : undefined;
  const result: ChessComImportResult = {
    requestedMonths,
    processedMonths,
    imported,
    skippedDuplicates,
    failedMonths,
    latestProcessedArchive,
    statusMessage: ""
  };

  result.statusMessage = describeImportResult(result);
  return result;
}

export async function discoverChessComArchiveMonths(
  username: string,
  overrides: Partial<ChessComImportDeps> = {}
): Promise<ChessComArchiveMonth[]> {
  const normalizedUsername = normalizeChessComUsername(username);
  if (!normalizedUsername) {
    throw new Error("Chess.com username is required.");
  }

  const deps = {
    ...defaultDeps(),
    ...overrides
  };

  return deps.listArchiveMonths(normalizedUsername);
}

export async function importChessComArchiveRange(
  args: {
    username: string;
    startMonthId: string;
    endMonthId: string;
  },
  overrides: Partial<ChessComImportDeps> = {}
): Promise<ChessComImportResult> {
  const normalizedUsername = normalizeChessComUsername(args.username);
  if (!normalizedUsername) {
    throw new Error("Chess.com username is required.");
  }

  const deps = {
    ...defaultDeps(),
    ...overrides
  };
  const availableMonths = await deps.listArchiveMonths(normalizedUsername);
  const selectedMonths = filterChessComArchiveMonthsInRange(availableMonths, args.startMonthId, args.endMonthId);
  return importArchiveMonths(normalizedUsername, selectedMonths, deps);
}

export async function syncChessComArchives(
  config: ChessComSyncConfig,
  overrides: Partial<ChessComImportDeps> = {}
): Promise<ChessComImportResult> {
  const normalizedUsername = normalizeChessComUsername(config.username);
  if (!normalizedUsername) {
    throw new Error("Chess.com username is required.");
  }

  const deps = {
    ...defaultDeps(),
    ...overrides
  };
  const availableMonths = await deps.listArchiveMonths(normalizedUsername);
  const selectedMonths = filterChessComArchiveMonthsAfter(availableMonths, config.lastSuccessfulArchive);

  if (selectedMonths.length === 0) {
    return {
      requestedMonths: [],
      processedMonths: [],
      imported: 0,
      skippedDuplicates: 0,
      failedMonths: [],
      latestProcessedArchive: config.lastSuccessfulArchive,
      statusMessage: "No new Chess.com archive months were available."
    };
  }

  return importArchiveMonths(normalizedUsername, selectedMonths, deps);
}
