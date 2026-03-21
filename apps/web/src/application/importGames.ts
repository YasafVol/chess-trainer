import { parsePgnCollection, shortHash } from "@chess-trainer/chess-core";
import { buildReplayData, moveToUci } from "../domain/gameReplay.js";
import type { GameRecord, GameSource, ImportBatchResult, ImportPreviewGame } from "../domain/types.js";
import { runtimeGateway } from "../lib/runtimeGateway.js";

type BuildImportPreviewsArgs = {
  rawInput: string;
  source: GameSource;
  existingGames?: GameRecord[];
};

type ImportGamesDeps = {
  listGames: () => Promise<GameRecord[]>;
  importBatch: (games: Omit<GameRecord, "userId">[]) => Promise<ImportBatchResult>;
  createId: () => string;
  nowIso: () => string;
};

function defaultDeps(): ImportGamesDeps {
  return {
    listGames: () => runtimeGateway.listGames(),
    importBatch: (games) => runtimeGateway.importGames(games),
    createId: () => crypto.randomUUID(),
    nowIso: () => new Date().toISOString()
  };
}

export async function buildImportPreviews(
  args: BuildImportPreviewsArgs
): Promise<ImportPreviewGame[]> {
  const existingGames = args.existingGames ?? await defaultDeps().listGames();
  const existingByHash = new Map(existingGames.map((game) => [game.hash, game.id]));
  const parsed = parsePgnCollection(args.rawInput);
  const previews: ImportPreviewGame[] = [];

  for (const game of parsed) {
    if (!game.hasMoves) {
      continue;
    }

    try {
      const replayData = buildReplayData(game.normalized, "startpos");
      const hash = await shortHash(game.normalized);
      previews.push({
        index: game.index,
        normalized: game.normalized,
        hash,
        headers: game.headers,
        movesUci: replayData.moves.map(moveToUci),
        hasMoves: game.hasMoves,
        duplicateOfGameId: existingByHash.get(hash),
        selected: !existingByHash.has(hash),
        source: args.source
      });
    } catch (error) {
      console.warn("[importGames] failed to build preview", {
        source: args.source,
        index: game.index,
        error
      });
    }
  }

  return previews;
}

export async function importSelectedPreviews(
  previews: ImportPreviewGame[],
  overrides: Partial<ImportGamesDeps> = {}
): Promise<ImportBatchResult> {
  const deps = {
    ...defaultDeps(),
    ...overrides
  };
  const selected = previews.filter((preview) => preview.selected && !preview.duplicateOfGameId);
  if (selected.length === 0) {
    return {
      imported: 0,
      skippedDuplicates: previews.filter((preview) => preview.duplicateOfGameId).length,
      skippedInvalid: 0,
      gameIds: []
    };
  }

  const now = deps.nowIso();
  return deps.importBatch(
    selected.map((preview) => ({
      id: deps.createId(),
      schemaVersion: 1,
      hash: preview.hash,
      pgn: preview.normalized,
      headers: preview.headers,
      initialFen: "startpos",
      movesUci: preview.movesUci,
      source: preview.source,
      createdAt: now,
      updatedAt: now
    }))
  );
}
