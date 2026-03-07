# Open Issues and Compromises

## Locked decisions snapshot

- Layer taxonomy and inward dependency rule are locked.
- TDD Red-Green-Refactor is required execution policy.
- The active shipment target is a local-first web app with browser-side analysis and IndexedDB persistence.
- Auth, cloud DB, and cross-device sync are explicitly deferred.

## Open Issues

1. Import, library, game, and puzzle routes still mix presentation and application orchestration.
2. Route-level UI tests are still missing.
3. Deployment smoke automation is still missing.
4. IndexedDB migration coverage is still shallow.

## Current Compromises

1. Route-centric orchestration in the web app is accepted temporarily for delivery velocity.
2. Manual browser smoke checks are still a primary quality gate for several high-risk paths.
3. Mock session and local-only persistence are accepted so the product can ship before cloud identity and sync.

## Deferred Items

1. Auth, remote DB, and cross-device sync
2. Convex-backed storage activation
3. Cloud platform imports
4. Advanced analytics and customization
5. Targeted deeper `MultiPV=3` puzzle extraction

## Mitigation Plan

1. Extract route orchestration into application services.
2. Add route-level component coverage for import, game, library, and puzzle flows.
3. Add deployment smoke coverage before enabling cloud features.
4. Expand IndexedDB migration tests before schema growth.
