# Open Issues and Compromises

## Locked decisions snapshot
- Layer taxonomy and inward dependency rule are locked.
- TDD Red-Green-Refactor is required execution policy.
- The active web shipment target is a mock-first local app with browser-side analysis and IndexedDB persistence.
- Convex, auth, and cross-device sync are explicitly deferred until after the mock app is live and validated.

## Open Issues
1. Plugin hotkey reliability (`BUGS.md`, open).
2. Plugin board drag/drop race condition in divergent manual lines (`BUGS.md`, open/deferred).
3. Move pane focus and scroll consistency (`BUGS.md`, open/deferred).
4. Companion service has no automated tests for process lifecycle and timeout behavior.
5. Web route files still mix presentation and application orchestration in import/library/game/puzzle flows.
6. Plugin and shared package duplicate PGN/contract logic.
7. Mock web app still lacks route-level UI tests and deployment smoke automation.

## Current Compromises
1. Monolithic plugin entry (`main.ts`) accepted temporarily to avoid blocking web delivery.
2. Route-centric orchestration in web app accepted temporarily for sprint velocity; progressively being extracted to `apps/web/src/application`.
3. Service orchestration embedded in handlers accepted until test harness exists.
4. Manual checklists are still primary quality gates for several high-risk paths.
5. Mock session and local-only persistence are accepted so the product can ship before cloud auth/storage.

## Deferred Items
1. Hosted analysis service option (after local contract hardening).
2. Auth, remote DB, and cross-device sync.
3. Convex-backed storage and Google sign-in activation.
4. Cloud platform imports (Chess.com/Lichess).
5. Advanced analytics and customization epics.
6. Targeted deeper `MultiPV=3` puzzle extraction.

## Mitigation Plan
1. Extract plugin import/analysis orchestration from `main.ts` into application modules.
2. Extract web route orchestration from route files into application services.
3. Add service integration tests (health, analyze, timeout, restart handling).
4. Consolidate shared PGN/contract logic into `packages/chess-core`.
5. Add contract compatibility tests between plugin/web/service analysis payloads.
6. Add deployment smoke coverage for the mock web app before enabling cloud features.

## Revisit Triggers
1. Repeated production regressions in replay/analysis/puzzle flows.
2. Contract-breaking change requests from UI or service teams.
3. Decision to reintroduce hosted runtime or auth requirements.
4. IndexedDB schema migration beyond the current local runtime shape.
5. Mock deployment stability proving the app is ready for cloud-backed identity and sync.
