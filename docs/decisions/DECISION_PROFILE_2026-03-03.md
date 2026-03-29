# Decision Profile - 2026-03-03

## Context

This decision profile establishes FITL Nav governance for the Chess Trainer web app and shared chess-core package.

## Locked Decisions

1. Canonical layer model is fixed as Contracts, Domain, Application, Adapters, Presentation, Composition.
2. Dependency rule is fixed: outer layers depend inward only.
3. Implementation flow is fixed per vertical:
   - tests(red) -> contracts -> domain -> application -> adapters -> presentation -> composition -> tests(green) -> refactor -> docs
4. Documentation updates are mandatory for non-trivial code changes.
5. Definition of Done includes docs, tests, and code.
6. Web v1 uses Convex-backed authenticated persistence with IndexedDB retained as a read cache and benchmark-only local store.
7. Browser-worker analysis is the active engine path.
8. TanStack Router is the active navigation/composition layer for the standalone SPA.
9. Convex/auth is on the active runtime path, but compile/test/build checks must still run without requiring a live signed-in browser session.

## Active Compromises

1. Route files still carry application orchestration in several user flows.
2. Route-level UI tests are still missing.
3. Deployment smoke automation is still manual.
4. Offline mutation queueing and conflict resolution are still intentionally deferred.

## Deferred Items

1. Offline write queueing and conflict resolution
2. Cross-device sync conflict tooling beyond server-last behavior
3. Lichess imports
4. Advanced analytics and customization
5. Deeper targeted `MultiPV` puzzle extraction

## Revisit Triggers

1. Any schema version bump beyond the current authenticated runtime assumptions
2. Any change to auth provider strategy, remote persistence ownership, or hosted analysis
3. Any sustained regression caused by route-local orchestration

## Governance Enforcement

- Every PR with behavior change must update:
  - relevant `docs/architecture/layers/*.md`
  - relevant `docs/architecture/verticals/v*.md`
  - relevant `docs/modules/*.md`
  - `docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md` when risks or deferrals change
