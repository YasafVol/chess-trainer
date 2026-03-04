# Module: Web App

## Scope
Standalone web runtime under `apps/web`.

## Layer Placement
- Contracts:
  - `apps/web/src/domain/types.ts`
  - `apps/web/src/board/BoardAdapter.ts`
  - engine message types in `apps/web/src/engine/engineClient.ts`
- Domain:
  - `apps/web/src/domain/analysisPolicy.ts`
  - `apps/web/src/domain/analysisPlan.ts`
  - `apps/web/src/domain/gameReplay.ts`
- Application:
  - use-case orchestration currently in:
    - `apps/web/src/routes/import.tsx`
    - `apps/web/src/routes/game.tsx`
    - `apps/web/src/routes/library.tsx`
- Adapters:
  - `apps/web/src/lib/storage/*`
  - `apps/web/src/engine/engineClient.ts`
  - `apps/web/src/engine/engine.worker.ts`
  - `apps/web/src/board/ChessboardElementAdapter.ts`
- Presentation:
  - route components in `apps/web/src/routes/*.tsx`
  - `apps/web/src/styles.css`
- Composition:
  - `apps/web/src/main.tsx`
  - `apps/web/src/router.tsx`

## Notes
- Current compromise: application logic is route-local; extraction to application services is planned.
- TDD anchor: `apps/web/src/domain/analysisPlan.test.ts`.
