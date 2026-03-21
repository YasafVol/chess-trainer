# V5: Puzzle Generation and Review

## Business/User Intent
Turn analyzed mistakes and blunders into reusable training material and let signed-in users review those puzzles with persistent spaced-repetition progress backed by Convex and mirrored into a local read cache.

## Flow Narrative
1. User imports a game and opens the game view.
2. User runs browser-side analysis.
3. System stores analysis snapshots in Convex, then derives puzzle candidates from qualifying eval swings.
4. System saves generated puzzles and review metadata in Convex and mirrors them into the local cache.
5. User opens the puzzles view, switches between blunder and mistake tabs, narrows the bank by ownership (`All`, `Mine`, `Other`) and difficulty when needed, or starts continuous mode for personal training.
6. Continuous mode builds an in-memory queue from the user's own puzzles only, serves blunders before mistakes, prioritizes due items before non-due items, and ranks each due-status bucket from weakest to strongest using failures and solve history.
7. User opens a single puzzle card or the continuous queue, attempts the best move, asks for a candidate-piece hint, or reveals the best move while keeping the full stored solution line behind collapsed disclosure.
8. System holds legal-but-suboptimal moves on the board with an error highlight until the user resets or retries, records attempts, animates the reveal/continuation sequence on the board, and in continuous mode short-cycle requeues failed or revealed puzzles later in the same session.

## Impacted Layers
- Contracts: puzzle, puzzle attempt, puzzle schedule, and puzzle-source contracts, including puzzle ownership.
- Domain: eval-swing classification, ownership derivation, puzzle generation, review scheduling rules, and continuous-session ranking/requeue policy.
- Application: foreground/background analysis completion triggers puzzle generation; solve actions trigger attempt recording.
- Adapters: Convex puzzle repositories plus IndexedDB read caching, including bank-wide attempt reads for session ranking.
- Presentation: puzzles list, continuous-mode route, and puzzle-solve routes.
- Presentation detail: puzzle cards are fully clickable, list metadata stays compact, the bank keeps severity tabs plus ownership and difficulty filters, the continuous session shell shows current phase/progress/retry state, and the solve view keeps the original blunder plus full solution line behind collapsed disclosure with local reset/try-again controls and configurable playback speed.
- Composition: authenticated Convex runtime bootstrap with read-only offline fallback.

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
  - Generated puzzles persist across reloads and authenticated sessions.
  - Solving or revealing a puzzle records an attempt, updates the next due date, and can replay the stored solution sequence on the board.
  - Puzzle list ordering prioritizes due items and recent failures.
  - Puzzle generation classifies each puzzle as `mine` or `other` from the authenticated user's profile plus the side that made the bad move.
  - Puzzle banks support severity tabs plus ownership and single-select difficulty filtering without changing ordering inside the filtered subset.
  - Continuous mode trains only `mine` puzzles, exhausts blunders before mistakes, requeues failed/revealed puzzles after a short gap, and rebuilds from persisted puzzle plus attempt data on refresh.
- Tests/gates:
  - Domain tests for eval thresholds, schedule rules, legacy-solution normalization, and continuous-session ranking/requeue behavior.
  - Presentation tests for puzzle filtering, blunder-label formatting, and solution playback frame generation.
  - Adapter tests for bank-wide puzzle-attempt reads used by continuous ranking.
  - Manual smoke test covering analyze -> generate -> continuous mode -> hint/reveal/solve -> retry requeue -> refresh.

## Risk/Deferment References
- Offline write queueing and richer cross-device conflict handling remain deferred.
- Targeted deeper `MultiPV=3` extraction remains deferred; current generation uses persisted primary PV.
