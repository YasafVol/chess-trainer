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
  - `apps/web/src/application/runAnalysisBenchmark.ts`
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
  - `apps/web/src/board/boardResize.ts`
- Presentation:
  - route components in `apps/web/src/routes/*.tsx`
  - replay presentation helpers in `apps/web/src/presentation/*`
  - `apps/web/src/styles.css`
- Composition:
  - `apps/web/src/main.tsx`
  - `apps/web/src/router.tsx`

## Notes
- Current compromise: import, library, and puzzle application logic is still route-local; extraction is still planned.
- Active build-critical runtime surfaces do not import live Convex/auth packages.
- TDD anchor: `apps/web/src/domain/analysisPlan.test.ts`.
- Replay board mounting now depends on explicit host-resize synchronization instead of implicit first-paint sizing from the third-party board element.
- Game analysis now stores both unrestricted best-line evaluations and restricted played-move evaluations so move rows can show move quality instead of only resulting-position scores.
- Game replay now renders a left-side eval bar, a clickable eval graph under the board, and SAN/NAG-style move suffixes (`!`, `?!`, `?`, `??`) derived from played-move loss.
- Foreground analysis now uses a movetime-first derived budget: projected per-ply wall time is computed from movetime, multiplied by game length, buffered for safety, and clamped by an emergency hard cap before being persisted on the run options.
- A read-only `/backoffice` route now exposes the currently hardcoded analysis and puzzle-definition constants so admins can inspect shipped values before dynamic config is introduced.
- `/backoffice/analysis-benchmark` now runs the shipped worker analysis pipeline against a bundled short-game PGN and reports aggregate timing metrics for supported runtime knobs, projected full-run runtime, and a recommended derived safety budget.
- Benchmark analysis data is intentionally written to a separate IndexedDB database so repeated experiments do not pollute normal game analysis history.
- Shipping target is a Vercel-hosted local-first app before reintroducing cloud sync or auth.
