# V6: Game View and Analysis Workbench

## Business/User Intent
Give users one reliable workspace for replaying an imported game, exploring manual branches, running browser-side analysis, inspecting evaluation output, and generating follow-on puzzles without leaving the game route.

## Flow Narrative
1. User opens a game from the library.
2. System loads the stored PGN, rebuilds replay state, and restores the latest saved analysis snapshot.
3. User navigates through plies, flips the board, autoplayes the line, or explores a manual branch.
4. User starts analysis from the game view.
5. System routes the request through the shared analysis coordinator, preempts any background run, then runs the browser-worker engine, persists run and ply snapshots, and updates progress, eval graph, and annotations in place.
6. When analysis completes, system derives puzzles from qualifying mistakes and blunders.

## Impacted Layers
- Contracts: game, analysis run, ply-analysis, board adapter, and replay-position contracts.
- Domain: replay derivation, move conversion, eval normalization, move annotations, and analysis policy rules.
- Application: route-local orchestration for current-ply state, autoplay, and manual-branch state, plus shared analysis-coordinator integration for execution, cancellation, preemption, and post-analysis puzzle generation.
- Adapters: `ChessboardElementAdapter`, resize synchronization, engine worker client, and local IndexedDB-backed save/load facades.
- Presentation: board shell, move list, eval bar, eval graph, analysis status text, progress feedback, and control surfaces on the game route.
- Composition: `/game/$gameId` route registration plus root-shell bootstrap of the shared analysis coordinator.

## Execution Order Per Layer
1. Tests (Red): replay-state, eval-view, and analysis orchestration coverage fails first.
2. Contracts: confirm game/run/ply/board interfaces required by the route.
3. Domain: keep replay, annotation, and budget rules deterministic and independently testable.
4. Application: isolate analysis/replay orchestration away from presentation concerns over time.
5. Adapters: keep board, storage, and engine integration behind narrow interfaces.
6. Presentation: render route state, loading/error states, and analysis feedback from prepared view data.
7. Composition: manage route mount/unmount, engine init, and board cleanup safely.
8. Tests (Green): route helpers, application services, and smoke paths pass.
9. Refactor: continue extracting route-local orchestration into application-layer services.
10. Docs updates: keep vertical, module, and decision docs aligned.

## Tests and Acceptance Criteria
- Acceptance criteria:
  - Opening a stored game reconstructs replay state and renders the board correctly.
  - Prev/Next/Reset/Play/Pause/Flip keep board, move list, and selected ply synchronized.
  - Manual moves create a temporary branch and can return to the canonical line.
  - Starting analysis updates progress in-place, preempts background work when needed, and persists the final run snapshot.
  - Saved eval graph points and move annotations remain available after refresh.
  - Completed analysis can trigger local puzzle generation from the same route.
- Tests/gates:
  - `apps/web/src/presentation/gameView.test.ts`
  - `apps/web/src/presentation/analysisView.test.ts`
  - `apps/web/src/application/runGameAnalysis.test.ts`
  - board adapter and resize tests
  - manual smoke coverage from `Spec/WEB_APP_SMOKE_CHECKLIST.md`

## Risk/Deferment References
- The `/game/$gameId` route still owns replay/board orchestration even though analysis execution moved into a shared application service.
- Engine flavor selection remains a product/runtime compromise until heavier assets and browser isolation are more predictable.
- Game view depends on browser custom-element board mounting and worker availability, so fallback and error handling remain important runtime concerns.
