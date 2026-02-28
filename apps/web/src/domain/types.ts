export type SchemaVersion = 1;

export type GameRecord = {
  id: string;
  schemaVersion: SchemaVersion;
  hash: string;
  pgn: string;
  headers: Record<string, string>;
  initialFen: string;
  movesUci: string[];
  createdAt: string;
  updatedAt: string;
};

export type AnalysisRun = {
  id: string;
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
  createdAt: string;
  completedAt?: string;
  error?: string;
};

export type PlyAnalysis = {
  id: string;
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
