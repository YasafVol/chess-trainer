import type {
  AnalysisRun,
  GameRecord,
  PlyAnalysis,
  Puzzle,
  PuzzleAttempt,
  SessionUser
} from "../domain/types";

function idToString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

export function toSessionUser(doc: any): SessionUser | null {
  if (!doc) {
    return null;
  }
  return {
    id: idToString(doc.id),
    name: doc.name ?? undefined,
    email: doc.email ?? undefined,
    image: doc.image ?? undefined
  };
}

export function toGameRecord(doc: any): GameRecord {
  return {
    id: doc.clientId,
    userId: idToString(doc.userId),
    schemaVersion: doc.schemaVersion,
    hash: doc.hash,
    pgn: doc.pgn,
    headers: doc.headers,
    initialFen: doc.initialFen,
    movesUci: doc.movesUci,
    source: doc.source,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export function toAnalysisRun(doc: any): AnalysisRun {
  return {
    id: doc.clientId,
    userId: idToString(doc.userId),
    gameId: doc.gameId,
    schemaVersion: doc.schemaVersion,
    engineName: doc.engineName,
    engineVersion: doc.engineVersion,
    engineFlavor: doc.engineFlavor,
    options: doc.options,
    status: doc.status,
    progressDone: doc.progressDone,
    progressTotal: doc.progressTotal,
    createdAt: doc.createdAt,
    completedAt: doc.completedAt,
    error: doc.error
  };
}

export function toPlyAnalysis(doc: any): PlyAnalysis {
  return {
    id: doc.clientId,
    userId: idToString(doc.userId),
    runId: doc.runId,
    gameId: doc.gameId,
    ply: doc.ply,
    fen: doc.fen,
    playedMoveUci: doc.playedMoveUci,
    bestMoveUci: doc.bestMoveUci,
    evaluationType: doc.evaluationType,
    evaluation: doc.evaluation,
    depth: doc.depth,
    nodes: doc.nodes,
    nps: doc.nps,
    timeMs: doc.timeMs,
    pvUci: doc.pvUci
  };
}

export function toPuzzle(doc: any): Puzzle {
  return {
    id: doc.clientId,
    userId: idToString(doc.userId),
    gameId: doc.gameId,
    source: {
      runId: doc.runId,
      ply: doc.sourcePly,
      sourceGameHash: doc.sourceGameHash
    },
    classification: doc.classification,
    fen: doc.fen,
    sideToMove: doc.sideToMove,
    evalSwing: doc.evalSwing,
    expectedBestMove: doc.expectedBestMove,
    expectedLine: doc.expectedLine,
    playedBadMove: doc.playedBadMove,
    themes: doc.themes,
    difficulty: doc.difficulty,
    schedule: {
      repetition: doc.repetition,
      intervalDays: doc.intervalDays,
      easeFactor: doc.easeFactor,
      dueAt: doc.dueAt,
      lastReviewedAt: doc.lastReviewedAt,
      consecutiveFailures: doc.consecutiveFailures
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export function toPuzzleAttempt(doc: any): PuzzleAttempt {
  return {
    id: doc.clientId,
    userId: idToString(doc.userId),
    puzzleId: doc.puzzleId,
    result: doc.result,
    quality: doc.quality,
    elapsedMs: doc.elapsedMs,
    hintsUsed: doc.hintsUsed,
    revealed: doc.revealed,
    attemptedAt: doc.attemptedAt
  };
}
