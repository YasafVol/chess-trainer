# V4: Library and Game Lifecycle

## Business/User Intent
Give users a reliable way to find previously imported games, reopen them quickly, and continue analysis/review without data loss.

## Flow Narrative
1. User opens library view.
2. System fetches stored games ordered by recent activity, regardless of whether they arrived from paste, upload, or Chess.com archive import.
3. User selects a game to open detailed replay/analysis view.
4. System loads latest analysis summary and per-ply snapshots.
5. User continues replay or reruns analysis as needed.

## Impacted Layers
- Contracts: game and analysis run record contracts, including source metadata for imported Chess.com games.
- Domain: sorting/lifecycle read-model rules.
- Application: fetch/refresh orchestration, background sync cursor persistence, and fallback state handling.
- Adapters: IndexedDB repositories and migration layer.
- Presentation: library list and game summary views.
- Composition: route registration and app bootstrap.

## Execution Order Per Layer
1. Tests (Red): failing list-order and latest-run resolution tests.
2. Contracts: verify list/read model fields and optional metadata.
3. Domain: codify ordering and latest-run selection rules.
4. Application: orchestrate load + refresh + empty/error states.
5. Adapters: implement/query indexes and repository methods.
6. Presentation: render lists and empty/error/loaded states.
7. Composition: route wiring and preload strategy.
8. Tests (Green): list/open/refresh behavior passes.
9. Refactor: extract fetch orchestration from route components.
10. Docs updates: matrix and module docs adjusted.

## Tests and Acceptance Criteria
- Acceptance criteria:
  - Library lists all games sorted by `updatedAt` descending.
  - Successfully imported Chess.com archive games appear in the same library lifecycle as pasted or uploaded PGN.
  - Opening a game loads replay and latest analysis summary.
  - Empty states and storage errors are user-visible and non-fatal.
- Tests/gates:
  - Add repository tests for sort/index behavior.
  - Web smoke checklist library and persistence checks.

## Risk/Deferment References
- `Spec/WEB_APP_BACKLOG.md` tickets: `WEB-005`, `WEB-302`.
- Deferred cloud sync/auth remain out of scope for this lifecycle in v1.
