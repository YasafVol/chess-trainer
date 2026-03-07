# Module: Web App

## Scope
Standalone web runtime under `apps/web`.

## Current Runtime Mode
- Active mode: standalone local-first web app.
- Durable data is stored in browser IndexedDB.
- TanStack Router is the active route composition and navigation layer.
- Convex and Google auth scaffolding remain in the repo as deferred surfaces, but are not on the active runtime path.

## Layer Placement
- Contracts:
  - `apps/web/src/domain/types.ts`
  - `apps/web/src/board/BoardAdapter.ts`
  - engine message types in `apps/web/src/engine/engineClient.ts`
- Domain:
  - `apps/web/src/domain/analysisPolicy.ts`
  - `apps/web/src/domain/analysisPlan.ts`
  - `apps/web/src/domain/analysisRunLifecycle.ts`
  - `apps/web/src/domain/gameReplay.ts`
  - `apps/web/src/domain/puzzles.ts`
- Application:
  - `apps/web/src/application/runGameAnalysis.ts`
  - remaining orchestration currently in:
    - `apps/web/src/routes/import.tsx`
    - `apps/web/src/routes/game.tsx`
    - `apps/web/src/routes/library.tsx`
    - `apps/web/src/routes/puzzle.tsx`
- Adapters:
  - `apps/web/src/lib/storage/*`
  - `apps/web/src/lib/mockData.ts`
  - `apps/web/src/lib/convex.ts` (deferred backend descriptor only)
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
- Current compromise: import, library, and puzzle application logic is still route-local; extraction is still planned.
- Active build-critical runtime surfaces do not import live Convex/auth packages.
- TDD anchor: `apps/web/src/domain/analysisPlan.test.ts`.
- Shipping target is a Vercel-hosted local-first app before reintroducing cloud sync or auth.
