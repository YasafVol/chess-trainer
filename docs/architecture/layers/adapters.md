# Adapters Layer

## Purpose
Bridge application use-cases to frameworks, storage engines, workers, HTTP services, and external binaries.

## Features / Responsibilities
- Vault upsert/read for plugin notes and annotations.
- IndexedDB persistence for web games and analysis runs.
- Worker command transport for browser Stockfish.
- HTTP client to companion service.
- Native Stockfish process and UCI command transport.

## Data / Contracts
- File adapter contracts: create/update/read paths and JSON payloads.
- DB adapter contracts: CRUD operations with schema versioning.
- Engine adapter contracts: init/analyze/cancel/terminate message protocol.
- HTTP adapter contracts: `/health`, `/analyze` request/response handling.

## Key Files
- `src/adapters/NoteRepo.ts`
- `src/services/analysis/AnnotationStorage.ts`
- `src/services/analysis/RemoteServiceAnalysisClient.ts`
- `apps/web/src/lib/storage/db.ts`
- `apps/web/src/lib/storage/migrations.ts`
- `apps/web/src/lib/storage/repositories/gamesRepo.ts`
- `apps/web/src/lib/storage/repositories/analysisRepo.ts`
- `apps/web/src/engine/engineClient.ts`
- `apps/web/src/engine/engine.worker.ts`
- `apps/web/src/board/ChessboardElementAdapter.ts`
- `stockfish-service/src/engine/StockfishProcess.ts`
- `stockfish-service/src/routes/analyze.ts`
- `stockfish-service/src/routes/health.ts`

## Internal Flows
- Plugin adapter writes note markdown and annotation JSON to vault.
- Web storage adapter writes game + analysis entities and rehydrates latest run.
- Worker adapter serializes command protocol and parses async engine lines.
- Service adapter serializes UCI requests and parses output back to HTTP JSON.

## User-Facing Flows
- Durable game storage and reload across sessions.
- Analysis execution without blocking UI (worker or companion service path).

## Tests / Quality Gates
- Adapter tests should mock infra boundaries and assert contract transformations.
- Current quality gates are mostly manual (smoke/API checks); automated adapter tests are a priority debt item.

## Open Risks / Deferred Items
- Companion service has no automated integration tests despite process complexity.
- Board drag/drop race remains unresolved in plugin path (see `BUGS.md`).
- IndexedDB migration coverage is minimal; add migration test harness before schema v2.
