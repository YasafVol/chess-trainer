# Open Issues and Compromises

## Locked decisions snapshot
- Layer taxonomy and inward dependency rule are locked.
- TDD Red-Green-Refactor is required execution policy.
- Web v1 excludes auth/cloud DB and keeps browser-native analysis.

## Open Issues
1. Plugin hotkey reliability (`BUGS.md`, open).
2. Plugin board drag/drop race condition in divergent manual lines (`BUGS.md`, open/deferred).
3. Move pane focus and scroll consistency (`BUGS.md`, open/deferred).
4. Companion service has no automated tests for process lifecycle and timeout behavior.
5. Web route files still mix presentation and application orchestration in import/library flows (analysis run loop was extracted).
6. Plugin and shared package duplicate PGN/contract logic.

## Current Compromises
1. Monolithic plugin entry (`main.ts`) accepted temporarily to avoid blocking V1/V1-web delivery.
2. Route-centric orchestration in web app accepted temporarily for sprint velocity; progressively being extracted to `apps/web/src/application`.
3. Service orchestration embedded in handlers accepted until test harness exists.
4. Manual checklists are still primary quality gates for several high-risk paths.

## Deferred Items
1. Hosted analysis service option (after local contract hardening).
2. Auth, remote DB, and cross-device sync.
3. Puzzle generation/training flows.
4. Cloud platform imports (Chess.com/Lichess).
5. Advanced analytics and customization epics.

## Mitigation Plan
1. Extract plugin import/analysis orchestration from `main.ts` into application modules.
2. Extract web analysis run orchestration from `routes/game.tsx` to application service.
3. Add service integration tests (health, analyze, timeout, restart handling).
4. Consolidate shared PGN/contract logic into `packages/chess-core`.
5. Add contract compatibility tests between plugin/web/service analysis payloads.

## Revisit Triggers
1. Repeated production regressions in replay/analysis flows.
2. Contract-breaking change requests from UI or service teams.
3. Introduction of hosted runtime or auth requirements.
4. IndexedDB schema migration beyond v1.
5. Community plugin release readiness review demanding stronger automated coverage.
