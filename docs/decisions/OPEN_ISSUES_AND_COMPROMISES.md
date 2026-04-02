# Open Issues and Compromises

## Locked decisions snapshot

- Layer taxonomy and inward dependency rule are locked.
- TDD Red-Green-Refactor is required execution policy.
- The active shipment target is an authenticated Convex-backed web app with browser-side analysis and IndexedDB read caching.
- TanStack Router remains the active routing layer for the standalone SPA runtime.
- Auth and remote DB are active; cross-device sync conflict handling remains limited to server-last state.
- The current rollout baseline stays pinned to Node `20.x`, npm workspaces, and the existing root `vercel.json` until the staged reinstatement plan explicitly advances those constraints.

## Open Issues

1. Import, library, game, and puzzle routes still mix presentation and application orchestration.
2. Route-level UI tests are still missing.
3. Deployment smoke automation is still missing.
4. IndexedDB migration coverage is still shallow.
5. Production SPA deep links are not yet verified to resolve through the hosting layer; Stage 2 found valid non-root routes such as `/library` returning Vercel `404: NOT_FOUND` instead of the SPA shell.

## Current Compromises

1. Route-centric orchestration in the web app is accepted temporarily for delivery velocity.
2. Manual browser smoke checks are still a primary quality gate for several high-risk paths.
3. Offline support is intentionally read-only; write queueing/sync remains out of scope.
4. Benchmark persistence remains local-only even though product data now lives in Convex.
5. The current production deploy is reachable at `/`, but direct SPA route entry is not yet safe to assume until hosting-level fallback behavior is corrected and reverified.

## Deferred Items

1. Offline write queueing and conflict resolution
2. Advanced analytics and customization
3. Targeted deeper `MultiPV=3` puzzle extraction
4. Deployment smoke automation
5. Broader route-level UI coverage

## Mitigation Plan

1. Extract route orchestration into application services.
2. Add route-level component coverage for import, game, library, and puzzle flows.
3. Add deployment smoke coverage around the authenticated Convex runtime.
4. Expand cache- and schema-alignment tests for the Convex-backed persistence path.
5. Continue extracting route orchestration into shared application/runtime services.
6. Use [`REINSTATEMENT_ROLLOUT_PLAN.md`](../../REINSTATEMENT_ROLLOUT_PLAN.md) as the gating document for staged deploy verification and later feature reinstatement.
7. Restore production SPA deep-link handling, then rerun Stage 2 verification from route load through authenticated import/library/game smoke coverage.
