import { makeFunctionReference } from "convex/server";
import type {
  AnalysisCoordinatorConfig,
  AnalysisRun,
  ChessComSyncConfig,
  GameRecord,
  ImportBatchResult,
  PlyAnalysis,
  Puzzle,
  PuzzleAttempt,
  PuzzlePlaybackConfig,
  PuzzleStats,
  SessionUser
} from "../domain/types";

type QueryArgs = Record<string, unknown>;

function queryRef<Args extends QueryArgs, Result>(name: string) {
  return makeFunctionReference<"query", Args, Result>(name);
}

function mutationRef<Args extends QueryArgs, Result>(name: string) {
  return makeFunctionReference<"mutation", Args, Result>(name);
}

export type ImportedGameInput = Omit<GameRecord, "userId">;
export type PersistedRunInput = Omit<AnalysisRun, "userId">;
export type PersistedPlyInput = Omit<PlyAnalysis, "userId">;
export type PersistedPuzzleAttemptInput = Omit<PuzzleAttempt, "id" | "userId">;
export type AnalysisSnapshot = {
  run: AnalysisRun | null;
  plies: PlyAnalysis[];
};
export type PuzzleDetails = {
  puzzle: Puzzle | null;
  attempts: PuzzleAttempt[];
  stats: PuzzleStats | null;
};
export type PuzzleBank = {
  puzzles: Puzzle[];
  attempts: PuzzleAttempt[];
};

export const convexApi = {
  auth: {
    signIn: makeFunctionReference<"action", Record<string, unknown>, unknown>("auth:signIn"),
    signOut: makeFunctionReference<"action", Record<string, unknown>, unknown>("auth:signOut")
  },
  users: {
    current: queryRef<Record<string, never>, SessionUser | null>("users:current")
  },
  games: {
    list: queryRef<Record<string, never>, GameRecord[]>("games:list"),
    get: queryRef<{ gameId: string }, GameRecord | null>("games:get"),
    importBatch: mutationRef<{ games: ImportedGameInput[] }, ImportBatchResult>("games:importBatch")
  },
  analysis: {
    snapshot: queryRef<{ gameId: string }, AnalysisSnapshot>("analysis:snapshot"),
    hasCompletedForGame: queryRef<{ gameId: string }, boolean>("analysis:hasCompletedForGame"),
    saveRun: mutationRef<{ run: PersistedRunInput }, string>("analysis:saveRun"),
    savePlies: mutationRef<{ plies: PersistedPlyInput[] }, number>("analysis:savePlies")
  },
  puzzles: {
    list: queryRef<Record<string, never>, Puzzle[]>("puzzles:list"),
    listAttempts: queryRef<Record<string, never>, PuzzleAttempt[]>("puzzles:listAttempts"),
    get: queryRef<{ puzzleId: string }, PuzzleDetails>("puzzles:get"),
    generateForRun: mutationRef<{ runId: string; gameId: string }, { created: number }>("puzzles:generateForRun"),
    recordAttempt: mutationRef<PersistedPuzzleAttemptInput & { puzzleId: string }, { dueAt: string }>("puzzles:recordAttempt")
  },
  appMeta: {
    getAnalysisCoordinatorConfig: queryRef<Record<string, never>, AnalysisCoordinatorConfig>("appMeta:getAnalysisCoordinatorConfig"),
    saveAnalysisCoordinatorConfig: mutationRef<{ config: AnalysisCoordinatorConfig }, AnalysisCoordinatorConfig>("appMeta:saveAnalysisCoordinatorConfig"),
    getPuzzlePlaybackConfig: queryRef<Record<string, never>, PuzzlePlaybackConfig>("appMeta:getPuzzlePlaybackConfig"),
    savePuzzlePlaybackConfig: mutationRef<{ config: PuzzlePlaybackConfig }, PuzzlePlaybackConfig>("appMeta:savePuzzlePlaybackConfig"),
    getChessComSyncConfig: queryRef<Record<string, never>, ChessComSyncConfig>("appMeta:getChessComSyncConfig"),
    saveChessComSyncConfig: mutationRef<{ config: ChessComSyncConfig }, ChessComSyncConfig>("appMeta:saveChessComSyncConfig")
  }
} as const;
