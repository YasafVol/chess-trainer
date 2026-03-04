# Contracts Layer

## Purpose
Define stable data shapes and protocol boundaries shared across plugin, web app, and companion service.

## Features / Responsibilities
- Define analysis request/response and evaluation structures.
- Define persisted game/run/ply record shapes.
- Define board adapter interface and move/drop contracts.
- Define plugin settings and analysis annotation data types.

## Data / Contracts
- Plugin:
  - `ChessTrainerSettings` (`src/types/settings.ts`)
  - `GameAnalysis`, `MoveAnalysis`, `PositionEvaluation` (`src/types/analysis.ts`)
- Web:
  - `GameRecord`, `AnalysisRun`, `PlyAnalysis` (`apps/web/src/domain/types.ts`)
  - `BoardAdapter` interface (`apps/web/src/board/BoardAdapter.ts`)
- Service:
  - `AnalysisRequestSchema`, `AnalysisResponse` (`stockfish-service/src/types.ts`)
- Shared core exports:
  - `normalizePgnInput`, `extractHeaders`, `sha1`, `shortHash` (`packages/chess-core/src/index.ts`)

## Key Files
- `src/types/settings.ts`
- `src/types/analysis.ts`
- `apps/web/src/domain/types.ts`
- `apps/web/src/board/BoardAdapter.ts`
- `stockfish-service/src/types.ts`
- `packages/chess-core/src/index.ts`

## Internal Flows
- Plugin UI and service client exchange typed analysis payloads.
- Web route and worker client exchange typed engine messages.
- Companion service validates inbound JSON via Zod before engine execution.

## User-Facing Flows
- Stable contracts prevent data loss across import, analysis, and reload.
- Contract consistency preserves annotation and library rendering behavior.

## Tests / Quality Gates
- Contract parsing behavior validated through:
  - `apps/web/src/domain/analysisPlan.test.ts` (domain boundary behavior)
  - manual companion API checks in `TESTING.md`
- Required gap:
  - Add explicit contract-level tests for service schema edge cases and plugin analysis serialization.

## Open Risks / Deferred Items
- Contract duplication exists between plugin and web analysis types; partial drift risk.
- Companion service response is not versioned yet; introduce versioned contract before external hosting.
