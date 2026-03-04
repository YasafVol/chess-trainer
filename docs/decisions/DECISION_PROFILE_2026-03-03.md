# Decision Profile - 2026-03-03

## Context
This decision profile establishes FITL Nav governance for a mixed-runtime chess project (Obsidian plugin + web transition + companion service).

## Locked Decisions
1. Canonical layer model is fixed as:
   1. Contracts
   2. Domain
   3. Application
   4. Adapters
   5. Presentation
   6. Composition
2. Dependency rule is fixed: outer layers depend inward only.
3. Implementation/refactor flow is fixed per vertical:
   - tests(red) -> contracts -> domain -> application -> adapters -> presentation -> composition -> tests(green) -> refactor -> docs
4. Documentation updates are mandatory for non-trivial code changes.
5. Definition of Done includes docs + tests + code.
6. Web v1 remains offline/local-first with no auth and no cloud DB.
7. Plugin analysis path remains companion-service based for current V1.

## Active Compromises
1. Plugin `main.ts` is monolithic and spans multiple layers.
2. Web `apps/web/src/routes/game.tsx` includes application orchestration directly in route UI.
3. Companion service route handlers include orchestration concerns instead of thin controller delegation.
4. Contract duplication exists across plugin/shared/service analysis types.

## Deferred Items (linked)
1. Cloud-hosted analysis endpoint (`Spec/V1_IMPLEMENTATION_PLAN.md`, optional milestone).
2. Auth + remote DB for web app (`Spec/WEB_APP_TRANSITION_PLAN.md`, out of scope v1).
3. Platform sync (Chess.com/Lichess) (`Spec/ROADMAP.md` V2).
4. Puzzle/training mode (`Spec/ROADMAP.md` V1.5).
5. Advanced analytics/search/customization (`Spec/ROADMAP.md` V3/V4).
6. Plugin hotkey reliability and board drag/drop race fixes (`BUGS.md`).

## Revisit Triggers
1. Any new runtime target (mobile native, hosted multi-user service).
2. Any schema version bump beyond current IndexedDB/service payload assumptions.
3. Any introduction of auth, remote persistence, or non-local analysis path.
4. Any sustained regression caused by monolithic orchestration files.
5. Any contract mismatch incident between plugin/web/service analysis payloads.

## Governance Enforcement
- Every PR with behavior change must update:
  - relevant `docs/architecture/layers/*.md`
  - relevant `docs/architecture/verticals/v*.md`
  - relevant `docs/modules/*.md`
  - `docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md` when risks/deferrals change
