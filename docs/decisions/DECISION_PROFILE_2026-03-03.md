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
6. Web v1 remains local-first with no auth and no cloud DB.
7. Browser-worker analysis is the active engine path.

## Active Compromises

1. Route files still carry application orchestration in several user flows.
2. Route-level UI tests are still missing.
3. Deployment smoke automation is still manual.

## Deferred Items

1. Auth and remote DB
2. Cross-device sync
3. Chess.com and Lichess imports
4. Advanced analytics and customization
5. Deeper targeted `MultiPV` puzzle extraction

## Revisit Triggers

1. Any schema version bump beyond the current local runtime assumptions
2. Any introduction of auth, remote persistence, or hosted analysis
3. Any sustained regression caused by route-local orchestration

## Governance Enforcement

- Every PR with behavior change must update:
  - relevant `docs/architecture/layers/*.md`
  - relevant `docs/architecture/verticals/v*.md`
  - relevant `docs/modules/*.md`
  - `docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md` when risks or deferrals change
