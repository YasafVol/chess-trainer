# Adapters Layer

## Purpose

Bridge application use-cases to browser storage, worker execution, and UI integration points.

## Features / Responsibilities

- IndexedDB persistence for games, analysis runs, puzzles, and puzzle attempts
- Reactive local mock-data facade
- Worker command transport for browser Stockfish
- Board library integration through an adapter interface
- Deferred backend descriptor for future Convex/auth activation without active runtime coupling

## Key Files

- `apps/web/src/lib/storage/db.ts`
- `apps/web/src/lib/storage/migrations.ts`
- `apps/web/src/lib/storage/repositories/gamesRepo.ts`
- `apps/web/src/lib/storage/repositories/analysisRepo.ts`
- `apps/web/src/lib/storage/repositories/puzzlesRepo.ts`
- `apps/web/src/lib/mockData.ts`
- `apps/web/src/lib/convex.ts`
- `apps/web/src/engine/engineClient.ts`
- `apps/web/src/engine/engine.worker.ts`
- `apps/web/src/board/ChessboardElementAdapter.ts`

## Tests / Quality Gates

- Adapter tests should mock browser and worker boundaries and assert contract transformations.
- Current automated adapter coverage exists for analysis repository behavior.

## Open Risks / Deferred Items

- IndexedDB migration coverage is still thin.
- Worker startup and failure-path coverage need broader automated tests.
- Deferred backend scaffolding remains nearby in the runtime tree and must stay isolated from build-critical web paths.
