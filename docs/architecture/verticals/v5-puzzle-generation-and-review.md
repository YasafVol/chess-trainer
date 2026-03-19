# V5: Puzzle Generation and Review

## Business/User Intent
Turn analyzed mistakes and blunders into reusable training material and let users review those puzzles locally with persistent spaced-repetition progress.

## Flow Narrative
1. User imports a game and opens the game view.
2. User runs browser-side analysis.
3. System stores analysis snapshots locally and derives puzzle candidates from qualifying eval swings.
4. System saves generated puzzles and review metadata in IndexedDB.
5. User opens the puzzles view, switches between blunder and mistake tabs, and narrows the bank by ownership (`All`, `Mine`, `Other`) and difficulty when needed.
6. User opens a puzzle card, attempts the best move, asks for a candidate-piece hint, or reveals the best move while keeping the full stored solution line behind collapsed disclosure.
7. System holds legal-but-suboptimal moves on the board with an error highlight until the user resets or retries, then records attempts and animates the reveal/continuation sequence on the board.

## Impacted Layers
- Contracts: puzzle, puzzle attempt, puzzle schedule, and puzzle-source contracts, including puzzle ownership.
- Domain: eval-swing classification, ownership derivation, puzzle generation, and review scheduling rules.
- Application: foreground/background analysis completion triggers puzzle generation; solve actions trigger attempt recording.
- Adapters: IndexedDB puzzle repositories and local mock-data facade.
- Presentation: puzzles list and puzzle-solve routes.
- Presentation detail: puzzle cards are fully clickable, list metadata stays compact, the bank keeps severity tabs plus ownership and difficulty filters, and the solve view keeps the original blunder plus full solution line behind collapsed disclosure with local reset/try-again controls and configurable playback speed.
- Composition: mock runtime bootstrap with no auth gate.

## Execution Order Per Layer
1. Tests (Red): puzzle classification and schedule tests.
2. Contracts: add puzzle-facing record shapes.
3. Domain: implement classification, generation helpers, and SM-2-style scheduling.
4. Application: connect analysis completion to puzzle generation and solve flows.
5. Adapters: persist puzzles and attempts locally.
6. Presentation: render tabbed puzzle banks, difficulty filtering, clickable cards, board-driven hints/reveal/reset/retry, and review feedback.
7. Composition: expose the puzzle routes in the mock app shell.
8. Tests (Green): analysis-to-puzzle and solve/review behavior passes.
9. Refactor: extract remaining route-local orchestration over time.
10. Docs updates: layer/module/decision trail adjusted.

## Tests and Acceptance Criteria
- Acceptance criteria:
  - Completed analysis can generate puzzles from mistakes and blunders.
  - Generated puzzles persist across reloads in the same browser.
  - Solving or revealing a puzzle records an attempt, updates the next due date, and can replay the stored solution sequence on the board.
  - Puzzle list ordering prioritizes due items and recent failures.
  - Puzzle generation classifies each puzzle as `mine` or `other` based on the configured local username and the side that made the bad move.
  - Puzzle banks support severity tabs plus ownership and single-select difficulty filtering without changing ordering inside the filtered subset.
- Tests/gates:
  - Domain tests for eval thresholds, schedule rules, and legacy-solution normalization.
  - Presentation tests for puzzle filtering, blunder-label formatting, and solution playback frame generation.
  - Manual smoke test covering analyze -> generate -> hint -> reveal -> solve -> refresh.

## Risk/Deferment References
- Convex sync, auth, and cross-device puzzle history remain deferred.
- Targeted deeper `MultiPV=3` extraction remains deferred; current generation uses persisted primary PV.
