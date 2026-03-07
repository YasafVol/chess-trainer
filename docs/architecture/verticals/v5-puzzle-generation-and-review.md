# V5: Puzzle Generation and Review

## Business/User Intent
Turn analyzed mistakes and blunders into reusable training material and let users review those puzzles locally with persistent spaced-repetition progress.

## Flow Narrative
1. User imports a game and opens the game view.
2. User runs browser-side analysis.
3. System stores analysis snapshots locally and derives puzzle candidates from qualifying eval swings.
4. System saves generated puzzles and review metadata in IndexedDB.
5. User opens the puzzles view, selects a due puzzle, and attempts the best move.
6. System records the attempt and updates the next review schedule.

## Impacted Layers
- Contracts: puzzle, puzzle attempt, puzzle schedule, and puzzle-source contracts.
- Domain: eval-swing classification, puzzle derivation, and review scheduling rules.
- Application: analysis completion triggers puzzle generation; solve actions trigger attempt recording.
- Adapters: IndexedDB puzzle repositories and local mock-data facade.
- Presentation: puzzles list and puzzle-solve routes.
- Composition: mock runtime bootstrap with no auth gate.

## Execution Order Per Layer
1. Tests (Red): puzzle classification and schedule tests.
2. Contracts: add puzzle-facing record shapes.
3. Domain: implement classification, generation helpers, and SM-2-style scheduling.
4. Application: connect analysis completion to puzzle generation and solve flows.
5. Adapters: persist puzzles and attempts locally.
6. Presentation: render puzzle list, solve screen, hints/reveal, and review feedback.
7. Composition: expose the puzzle routes in the mock app shell.
8. Tests (Green): analysis-to-puzzle and solve/review behavior passes.
9. Refactor: extract remaining route-local orchestration over time.
10. Docs updates: layer/module/decision trail adjusted.

## Tests and Acceptance Criteria
- Acceptance criteria:
  - Completed analysis can generate puzzles from mistakes and blunders.
  - Generated puzzles persist across reloads in the same browser.
  - Solving or revealing a puzzle records an attempt and updates the next due date.
  - Puzzle list ordering prioritizes due items and recent failures.
- Tests/gates:
  - Domain tests for eval thresholds and scheduling.
  - Manual smoke test covering analyze -> generate -> solve -> refresh.

## Risk/Deferment References
- Convex sync, auth, and cross-device puzzle history remain deferred.
- Targeted deeper `MultiPV=3` extraction remains deferred; current generation uses persisted primary PV.
