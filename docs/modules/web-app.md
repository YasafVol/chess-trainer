# Module: Web App

## Scope
Standalone web runtime under `apps/web`.

## Current Runtime Mode
- Active mode: standalone authenticated Convex-backed web app.
- Durable product data is stored in Convex and mirrored into a browser IndexedDB read cache.
- TanStack Router is the active route composition and navigation layer.
- Convex and Google auth are now on the active runtime path for product persistence.

## Layer Placement
- Contracts:
  - `apps/web/src/domain/types.ts`
  - `apps/web/src/board/BoardAdapter.ts`
  - engine message types in `apps/web/src/engine/engineClient.ts`
- Domain:
  - `apps/web/src/domain/analysisCoordinatorConfig.ts`
  - `apps/web/src/domain/analysisPolicy.ts`
  - `apps/web/src/domain/analysisPlan.ts`
  - `apps/web/src/domain/analysisRunLifecycle.ts`
  - `apps/web/src/domain/chessComSyncConfig.ts`
  - `apps/web/src/domain/chessComArchives.ts`
  - `apps/web/src/domain/fitlGraphTypes.ts`
  - `apps/web/src/domain/fitlGraph.ts`
  - `apps/web/src/domain/gameReplay.ts`
  - `apps/web/src/domain/continuousPuzzleSession.ts`
  - `apps/web/src/domain/puzzlePlaybackConfig.ts`
  - `apps/web/src/domain/puzzles.ts`
- Application:
  - `apps/web/src/application/analysisCoordinator.ts`
  - `apps/web/src/application/chessComImport.ts`
  - `apps/web/src/application/chessComSyncCoordinator.ts`
  - `apps/web/src/application/importGames.ts`
  - `apps/web/src/application/runGameAnalysis.ts`
  - `apps/web/src/application/runAnalysisBenchmark.ts`
  - remaining orchestration currently in:
    - `apps/web/src/routes/library.tsx`
    - `apps/web/src/routes/puzzle.tsx`
- Adapters:
  - `apps/web/src/lib/chessComApi.ts`
  - `apps/web/src/lib/storage/*`
  - `apps/web/src/lib/runtimeGateway.tsx`
  - `apps/web/src/lib/convex.ts`
  - `apps/web/src/engine/engineClient.ts`
  - `apps/web/src/engine/engine.worker.ts`
  - `apps/web/src/board/ChessboardElementAdapter.ts`
  - `apps/web/src/board/boardResize.ts`
  - `apps/web/scripts/generate-fitl-graph.mjs`
  - `apps/web/scripts/fitlGraphSource.mjs`
  - generated FITL snapshot in `apps/web/src/generated/fitlGraphSnapshot.ts`
- Presentation:
  - route components in `apps/web/src/routes/*.tsx`
  - Chess.com settings and import helpers in `apps/web/src/presentation/*`
  - replay presentation helpers in `apps/web/src/presentation/*`
  - design system: Tailwind CSS v4 theme in `apps/web/src/index.css`, shadcn/ui components in `apps/web/src/components/ui/*.tsx`, `cn()` utility in `apps/web/src/lib/utils.ts`
  - domain-specific CSS (eval bar, eval graph SVG, FITL canvas, board host) in `apps/web/src/styles.css`
- Composition:
  - `apps/web/src/main.tsx`
  - `apps/web/src/router.tsx`

## Notes
- Current compromise: library and puzzle application logic is still route-local; replay/board orchestration also remains route-local even though analysis execution, Chess.com sync, and PGN import orchestration now flow through shared application helpers/coordinators.
- Puzzle records now normalize a canonical `solutionMoves` sequence at read/write time so legacy stored puzzles remain playable without IndexedDB migration.
- Puzzle records also normalize a legacy-safe ownership value so existing stored puzzles remain readable while the app adds `mine` versus `other` filtering.
- Active build-critical runtime surfaces now import live Convex/auth packages through the runtime gateway and `ConvexAuthProvider`.
- TDD anchor: `apps/web/src/domain/analysisPlan.test.ts`.
- Replay board mounting now depends on explicit host-resize synchronization instead of implicit first-paint sizing from the third-party board element.
- Game analysis now stores both unrestricted best-line evaluations and restricted played-move evaluations so move rows can show move quality instead of only resulting-position scores.
- App bootstrap now initializes a shared analysis coordinator that scans the local library every 30 seconds, starts background analysis for the first game without a completed run, and immediately yields to explicit foreground analysis requests.
- App bootstrap now also initializes a shared Chess.com sync coordinator that reads Backoffice-owned username/cadence settings, waits for an initial manual archive import cursor, and then checks for newly available finished archive months while the app remains open.
- The backoffice route now persists lazy-analysis enablement/scan interval and puzzle playback speed in Convex-backed `appMeta`, with IndexedDB used only as a read cache.
- The backoffice route now also owns the saved Chess.com username and daily/weekly sync cadence; the import route reads those settings but does not edit them.
- The import route now supports bounded Chess.com monthly archive import via the saved username while preserving the existing paste/upload PGN preview flow.
- The backoffice route now also links to `/backoffice/fitl-map`, a docs-driven FITL explorer that lands on a project overview, deepens by focus plus depth, and exports structured AI change briefs.
- Game replay now renders a left-side eval bar, a clickable eval graph under the board, and SAN/NAG-style move suffixes (`!`, `?!`, `?`, `??`) derived from played-move loss.
- Puzzle review now uses compact tabbed banks with ownership and difficulty filtering, a dedicated continuous mode for `mine` puzzles, clickable cards, hidden original-blunder disclosure, candidate-piece hints, reset/try-again controls, legal-wrong move hold/red highlighting, and animated solution playback on the board.
- Continuous mode ranks eligible puzzles from weakest to strongest inside due/non-due buckets using consecutive failures, solve rate, attempt count, difficulty, eval swing, due date, and update time, then short-cycle requeues failed or revealed puzzles later in the same session.
- Foreground analysis now uses a movetime-first derived budget: projected per-ply wall time is computed from movetime, multiplied by game length, buffered for safety, and clamped by an emergency hard cap before being persisted on the run options.
- `/backoffice` now exposes persisted lazy-analysis runtime controls plus the remaining hardcoded analysis and puzzle-definition constants for inspection.
- `/backoffice/analysis-benchmark` now runs the shipped worker analysis pipeline against a bundled short-game PGN and reports aggregate timing metrics for supported runtime knobs, projected full-run runtime, and a recommended derived safety budget.
- FITL explorer data is generated at dev/build/test startup from canonical FITL markdown plus `apps/web/fitl-tooling.manifest.json`; the browser runtime reads only the generated snapshot.
- Benchmark analysis data is intentionally written to a separate IndexedDB database so repeated experiments do not pollute normal game analysis history or depend on Convex.
- Offline support is intentionally read-only: cached data can be viewed offline, but writes require an authenticated online session.
- The shadcn Tailwind helper layer is vendored under `apps/web/src/shadcn-tailwind.css`; the `shadcn` CLI is expected to run via `npx` only when generating new UI primitives.
- Vercel production installs intentionally run from `apps/web` with `npm install --ignore-scripts` against the app-local lockfile, and the deploy command uses the app-local `convex`, `tsc`, and `vite` binaries directly.
