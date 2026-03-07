export type SchemaVersion = 1;

export type GameRecord = {
  id: string;
  schemaVersion: SchemaVersion;
  userId: string;
  hash: string;
  pgn: string;
  headers: Record<string, string>;
  initialFen: string;
  movesUci: string[];
  source: "paste" | "upload";
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

export type PlyAnalysis = {
  id: string;
  userId: string;
  runId: string;
  gameId: string;
  ply: number;
  fen: string;
  playedMoveUci?: string;
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
  source: "paste" | "upload";
};

export type ImportBatchResult = {
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  gameIds: string[];
};

export type PuzzleClassification = "inaccuracy" | "mistake" | "blunder";

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
  fen: string;
  sideToMove: "w" | "b";
  evalSwing: number;
  expectedBestMove: string;
  expectedLine: string[];
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
