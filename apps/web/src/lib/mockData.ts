import { useEffect, useRef, useState } from "react";
import type { AnalysisRun, GameRecord, ImportBatchResult, PlyAnalysis, Puzzle, PuzzleAttempt, SessionUser } from "../domain/types";
import { buildPuzzleStats, candidatePuzzlePairs, classifyEvalSwing, createInitialSchedule, inferThemes, initialPuzzleDifficulty, nextReviewOrder, nextScheduleFromQuality } from "../domain/puzzles";
import { getLatestAnalysisRunByGameId, listPlyAnalysisByGameId, listPlyAnalysisByRunId, saveAnalysisRun, savePlyAnalysis } from "./storage/repositories/analysisRepo";
import { getGame, listGames, saveGame } from "./storage/repositories/gamesRepo";
import { getPuzzle, listPuzzleAttemptsByPuzzleId, listPuzzles, savePuzzle, savePuzzleAttempt } from "./storage/repositories/puzzlesRepo";

const LOCAL_USER: SessionUser = {
  id: "local-user",
  name: "Local mock user",
  email: "local@mock"
};

const listeners = new Set<() => void>();

function emitChange(reason: string, payload?: Record<string, unknown>) {
  console.log("[mockData] emit change", { reason, ...payload });
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useAsyncValue<T>(load: () => Promise<T>, deps: unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => subscribe(() => setVersion((current) => current + 1)), []);
  useEffect(() => {
    let active = true;
    void loadRef.current().then((next) => {
      if (active) {
        setValue(next);
      }
    });
    return () => {
      active = false;
    };
  }, [version, ...deps]);

  return value;
}

function withLocalUser<T extends object>(record: T): T & { userId: string } {
  return {
    ...record,
    userId: LOCAL_USER.id
  };
}

export function useMockSession() {
  return {
    isLoading: false,
    isAuthenticated: true,
    user: LOCAL_USER
  };
}

export function useLocalGames() {
  return useAsyncValue(async () => {
    const games = await listGames();
    return games.filter((game) => game.userId === LOCAL_USER.id);
  }, []);
}

export function useLocalGame(gameId: string) {
  return useAsyncValue(async () => {
    const game = await getGame(gameId);
    return game && game.userId === LOCAL_USER.id ? game : null;
  }, [gameId]);
}

export function useLocalAnalysisSnapshot(gameId: string) {
  return useAsyncValue(async () => {
    const [run, plies] = await Promise.all([
      getLatestAnalysisRunByGameId(gameId),
      listPlyAnalysisByGameId(gameId)
    ]);

    return {
      run: run && run.userId === LOCAL_USER.id ? run : null,
      plies: plies.filter((ply) => ply.userId === LOCAL_USER.id)
    };
  }, [gameId]);
}

export function useLocalPuzzles() {
  return useAsyncValue(async () => {
    const puzzles = await listPuzzles();
    return nextReviewOrder(puzzles.filter((puzzle) => puzzle.userId === LOCAL_USER.id));
  }, []);
}

export function useLocalPuzzleDetails(puzzleId: string) {
  return useAsyncValue(async () => {
    const puzzle = await getPuzzle(puzzleId);
    if (!puzzle || puzzle.userId !== LOCAL_USER.id) {
      return { puzzle: null, attempts: [], stats: null };
    }

    const attempts = (await listPuzzleAttemptsByPuzzleId(puzzleId)).filter((attempt) => attempt.userId === LOCAL_USER.id);
    return {
      puzzle,
      attempts,
      stats: buildPuzzleStats(puzzle, attempts)
    };
  }, [puzzleId]);
}

export async function importBatchLocal(games: Omit<GameRecord, "userId">[]): Promise<ImportBatchResult> {
  const existing = await listGames();
  const seenHashes = new Set(existing.filter((game) => game.userId === LOCAL_USER.id).map((game) => game.hash));
  let imported = 0;
  let skippedDuplicates = 0;
  const gameIds: string[] = [];

  console.log("[mockData] import batch", {
    requested: games.length,
    existingGames: seenHashes.size
  });

  for (const game of games) {
    if (seenHashes.has(game.hash)) {
      skippedDuplicates += 1;
      continue;
    }

    const nextGame: GameRecord = withLocalUser(game);
    await saveGame(nextGame);
    seenHashes.add(nextGame.hash);
    imported += 1;
    gameIds.push(nextGame.id);
  }

  emitChange("importBatch", {
    imported,
    skippedDuplicates,
    gameIds
  });
  return {
    imported,
    skippedDuplicates,
    skippedInvalid: 0,
    gameIds
  };
}

export async function saveRunLocal(run: AnalysisRun): Promise<void> {
  console.log("[mockData] save run", {
    runId: run.id,
    gameId: run.gameId,
    status: run.status
  });
  await saveAnalysisRun(withLocalUser(run));
  emitChange("saveRun", {
    runId: run.id,
    gameId: run.gameId,
    status: run.status
  });
}

export async function savePlyLocal(plies: PlyAnalysis[]): Promise<void> {
  for (const ply of plies) {
    console.log("[mockData] save ply", {
      runId: ply.runId,
      gameId: ply.gameId,
      ply: ply.ply,
      evaluation: ply.evaluation,
      bestMoveUci: ply.bestMoveUci
    });
    await savePlyAnalysis(withLocalUser(ply));
  }
  emitChange("savePly", {
    count: plies.length,
    runId: plies[0]?.runId,
    gameId: plies[0]?.gameId
  });
}

function puzzleIdFor(game: GameRecord, ply: PlyAnalysis): string {
  return `${game.hash}:${ply.ply}:${ply.bestMoveUci ?? "unknown"}`;
}

export async function generatePuzzlesForRunLocal(runId: string, gameId: string): Promise<number> {
  const game = await getGame(gameId);
  if (!game || game.userId !== LOCAL_USER.id) {
    console.warn("[mockData] cannot generate puzzles for missing game", { runId, gameId });
    return 0;
  }

  const plies = (await listPlyAnalysisByRunId(runId)).filter((ply) => ply.userId === LOCAL_USER.id);
  const existing = new Set((await listPuzzles()).filter((puzzle) => puzzle.userId === LOCAL_USER.id).map((puzzle) => puzzle.id));
  const now = new Date().toISOString();
  let created = 0;
  const bankCounts: Record<"mistake" | "blunder", number> = {
    mistake: 0,
    blunder: 0
  };

  console.log("[mockData] generate puzzles", {
    runId,
    gameId,
    availablePlies: plies.length,
    existingPuzzles: existing.size
  });

  for (const pair of candidatePuzzlePairs(plies)) {
    const classification = classifyEvalSwing(pair.evalSwing);
    if (!classification || classification === "inaccuracy" || !pair.before.bestMoveUci || !pair.before.playedMoveUci) {
      continue;
    }

    const puzzleId = puzzleIdFor(game, pair.before);
    if (existing.has(puzzleId)) {
      continue;
    }

    const line = pair.before.pvUci.length > 0 ? pair.before.pvUci : [pair.before.bestMoveUci];
    const fenParts = pair.before.fen.split(" ");
    const sideToMove = fenParts[1] === "b" ? "b" : "w";
    const puzzle: Puzzle = {
      id: puzzleId,
      userId: LOCAL_USER.id,
      gameId,
      source: {
        runId,
        ply: pair.before.ply,
        sourceGameHash: game.hash
      },
      classification,
      fen: pair.before.fen,
      sideToMove,
      evalSwing: pair.evalSwing,
      expectedBestMove: pair.before.bestMoveUci,
      expectedLine: line,
      playedBadMove: pair.before.playedMoveUci,
      themes: inferThemes(line, pair.before.playedMoveUci),
      difficulty: initialPuzzleDifficulty({
        evalSwing: pair.evalSwing,
        bestLine: line,
        evaluationType: pair.before.evaluationType
      }),
      schedule: createInitialSchedule(now),
      createdAt: now,
      updatedAt: now
    };

    console.log("[mockData] create puzzle", {
      puzzleId: puzzle.id,
      classification: puzzle.classification,
      sourcePly: puzzle.source.ply,
      expectedBestMove: puzzle.expectedBestMove,
      playedBadMove: puzzle.playedBadMove
    });

    await savePuzzle(puzzle);
    existing.add(puzzle.id);
    if (puzzle.classification === "mistake" || puzzle.classification === "blunder") {
      bankCounts[puzzle.classification] += 1;
    }
    created += 1;
  }

  if (created > 0) {
    emitChange("generatePuzzles", {
      runId,
      gameId,
      created,
      bankCounts
    });
  }
  return created;
}

export async function recordPuzzleAttemptLocal(args: Omit<PuzzleAttempt, "id" | "userId">): Promise<void> {
  const puzzle = await getPuzzle(args.puzzleId);
  if (!puzzle || puzzle.userId !== LOCAL_USER.id) {
    console.warn("[mockData] cannot record puzzle attempt for missing puzzle", { puzzleId: args.puzzleId });
    return;
  }

  const attempt: PuzzleAttempt = {
    ...args,
    id: crypto.randomUUID(),
    userId: LOCAL_USER.id
  };

  console.log("[mockData] record puzzle attempt", {
    puzzleId: attempt.puzzleId,
    result: attempt.result,
    quality: attempt.quality,
    hintsUsed: attempt.hintsUsed,
    revealed: attempt.revealed
  });

  await savePuzzleAttempt(attempt);
  await savePuzzle({
    ...puzzle,
    schedule: nextScheduleFromQuality(puzzle.schedule, attempt.quality, attempt.attemptedAt),
    updatedAt: attempt.attemptedAt
  });
  emitChange("recordPuzzleAttempt", {
    puzzleId: attempt.puzzleId,
    result: attempt.result,
    quality: attempt.quality
  });
}

