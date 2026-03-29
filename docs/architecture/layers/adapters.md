# Adapters Layer

## Purpose

Bridge application use-cases to Convex persistence, browser caching, worker execution, and UI integration points.

## Features / Responsibilities

- Convex-backed persistence for games, analysis runs, puzzles, attempts, and app metadata
- IndexedDB read caching for product data plus isolated benchmark-only local storage
- Worker command transport for browser Stockfish, including `searchmoves`-based played-move analysis
- Board library integration through an adapter interface, including explicit resize synchronization for late-mounted hosts
- Runtime gateway that coordinates live Convex reads and mutations with offline read fallback

## Key Files

- `apps/web/src/lib/storage/db.ts`
- `apps/web/src/lib/storage/migrations.ts`
- `apps/web/src/lib/storage/repositories/gamesRepo.ts`
- `apps/web/src/lib/storage/repositories/analysisRepo.ts`
- `apps/web/src/lib/storage/repositories/puzzlesRepo.ts`
- `apps/web/src/lib/runtimeGateway.tsx`
- `apps/web/src/lib/convex.ts`
- `apps/web/src/engine/engineClient.ts`
- `apps/web/src/engine/engine.worker.ts`
- `apps/web/src/board/ChessboardElementAdapter.ts`

## Tests / Quality Gates

- Adapter tests should mock browser and worker boundaries and assert contract transformations.
- Current automated adapter coverage exists for analysis repository behavior.
- Board adapter coverage now includes resize delegation and host-resize synchronization tests.
- Analysis orchestration coverage now asserts restricted-move searches for played-move evaluation.

## Open Risks / Deferred Items

- IndexedDB migration coverage is still thin.
- Worker startup and failure-path coverage need broader automated tests.
- Offline write queueing remains deferred; the cache is intentionally read-only while disconnected.
