# ADR-003: Browser Storage Schema and Versioning

**Status**: Accepted  
**Date**: 2026-02-25

## Context

The app needs durable local persistence for games and analysis without remote DB. There is no official Stockfish analysis database schema standard for app storage. Standards exist for notation/protocol (`PGN`, `FEN`, `UCI`) but not full app-level persistence structure.

## Decision

Use **IndexedDB** with explicit app schema versioning and migration steps.

Top-level stores:

1. `games`
2. `analysisRuns`
3. `analysisByPly`
4. `appMeta`

## Canonical Shapes

## `games`

```ts
type GameRecord = {
  id: string;                 // uuid
  schemaVersion: number;      // app schema version
  hash: string;               // deterministic PGN hash
  pgn: string;
  headers: Record<string, string>;
  initialFen: string;         // "startpos" or FEN
  movesUci: string[];
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
};
```

## `analysisRuns`

```ts
type AnalysisRun = {
  id: string;                 // uuid
  gameId: string;
  schemaVersion: number;
  engineName: string;         // e.g. "Stockfish"
  engineVersion: string;      // e.g. "18"
  engineFlavor: string;       // e.g. "stockfish-18-lite-single"
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
```

## `analysisByPly`

```ts
type PlyAnalysis = {
  id: string;                 // uuid
  runId: string;
  gameId: string;
  ply: number;                // 0-based
  fen: string;
  playedMoveUci?: string;
  bestMoveUci?: string;
  evaluationType: "cp" | "mate";
  evaluation: number;         // cp or mate score representation
  depth: number;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pvUci: string[];            // principal variation
};
```

## Versioning Rules

1. `schemaVersion` is mandatory on all records.
2. Any breaking schema change increments version and adds migration.
3. Migrations are deterministic and idempotent.
4. Preserve raw chess notation compatibility:
   - store PGN original text
   - store UCI move arrays
   - derive FEN per ply when needed

## Trade-offs

### Benefits

1. Fully offline-first.
2. Clear migration path.
3. Analysis reproducibility through engine metadata + options.

### Costs

1. More client complexity than localStorage-only.
2. Migration code must be maintained.
3. Storage cleanup policy is required for very large libraries.

## Revisit Trigger

Revisit when:

1. Multi-device sync becomes a priority.
2. Data volume exceeds acceptable browser storage behavior.
3. Cloud DB is introduced and local schema must become cache layer only.
