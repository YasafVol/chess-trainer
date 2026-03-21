export type SchemaVersion = 1;
export type GameSource = "paste" | "upload" | "chesscom";
export type ChessComSyncInterval = "daily" | "weekly";

export type GameRecord = {
  id: string;
  schemaVersion: SchemaVersion;
  userId: string;
  hash: string;
  pgn: string;
  headers: Record<string, string>;
  initialFen: string;
  movesUci: string[];
  source: GameSource;
  createdAt: string;
  updatedAt: string;
};

export type AnalysisRun = {
  id: string;
  userId: string;
  gameId: string;
  schemaVersion: SchemaVersion;
  engineName: string;
  engineVersion: string;
  engineFlavor: string;
  options: {
    depth: number;
    multiPV: number;
    movetimeMs?: number;
    foregroundBudgetMs?: number;
    threads?: number;
    hashMb?: number;
  };
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progressDone?: number;
  progressTotal?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
};

export type AnalysisCoordinatorConfig = {
  enabled: boolean;
  intervalMs: number;
};

export type PuzzlePlaybackConfig = {
  stepMs: number;
};

export type ChessComSyncConfig = {
  username: string;
  enabled: boolean;
  interval: ChessComSyncInterval;
  lastSyncAt?: string;
  lastSuccessfulArchive?: string;
  lastStatus?: string;
};

export type ChessComArchiveMonth = {
  id: string;
  year: number;
  month: number;
  url: string;
  label: string;
};

export type ChessComImportResult = {
  requestedMonths: string[];
  processedMonths: string[];
  imported: number;
  skippedDuplicates: number;
  failedMonths: string[];
  statusMessage: string;
  latestProcessedArchive?: string;
};

export type PlyAnalysis = {
  id: string;
  userId: string;
  runId: string;
  gameId: string;
  ply: number;
  fen: string;
  playedMoveUci?: string;
  playedMoveEvaluationType?: "cp" | "mate";
  playedMoveEvaluation?: number;
  playedMoveDepth?: number;
  playedMovePvUci?: string[];
  bestMoveUci?: string;
  evaluationType: "cp" | "mate";
  evaluation: number;
  depth: number;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pvUci: string[];
};

export type ImportPreviewGame = {
  index: number;
  normalized: string;
  hash: string;
  headers: Record<string, string>;
  movesUci: string[];
  hasMoves: boolean;
  duplicateOfGameId?: string;
  selected: boolean;
  source: GameSource;
};

export type ImportBatchResult = {
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  gameIds: string[];
};

export type PuzzleClassification = "inaccuracy" | "mistake" | "blunder";
export type PuzzleOwnership = "mine" | "other";

export type PuzzleScheduleState = {
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
  lastReviewedAt?: string;
  consecutiveFailures: number;
};

export type PuzzleSource = {
  runId: string;
  ply: number;
  sourceGameHash: string;
};

export type Puzzle = {
  id: string;
  userId: string;
  gameId: string;
  source: PuzzleSource;
  classification: PuzzleClassification;
  ownership: PuzzleOwnership;
  fen: string;
  sideToMove: "w" | "b";
  evalSwing: number;
  expectedBestMove: string;
  expectedLine: string[];
  solutionMoves: string[];
  playedBadMove?: string;
  themes: string[];
  difficulty: number;
  schedule: PuzzleScheduleState;
  createdAt: string;
  updatedAt: string;
};

export type PuzzleAttempt = {
  id: string;
  userId: string;
  puzzleId: string;
  result: "success" | "fail";
  quality: number;
  elapsedMs: number;
  hintsUsed: number;
  revealed: boolean;
  attemptedAt: string;
};

export type PuzzleStats = {
  attempts: number;
  successes: number;
  failures: number;
  firstTrySuccessRate: number;
  overallSuccessRate: number;
  currentStreak: number;
  nextDueAt?: string;
};

export type SessionUser = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
};
