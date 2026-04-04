# V1: Import and Persist PGN

## Business/User Intent

Allow a signed-in user to paste or upload PGN, or fetch bounded Chess.com archive PGN by a saved username, and reliably persist reusable remote game records with metadata, deterministic identity, and immediate feedback while retaining read-only cached access offline.

## Impacted Layers

- Contracts: PGN, header, hash, and `GameRecord` contracts
- Domain: normalization, parsing, replay derivation, hashing, Chess.com username normalization, and archive-range validation
- Application: import orchestration, duplicate handling, and Chess.com archive import coordination
- Adapters: Convex game mutations, IndexedDB read-cache writes, and browser fetches against Chess.com monthly archive endpoints
- Presentation: import form, preview list, bounded Chess.com archive controls, and feedback
- Composition: route wiring

## Tests and Acceptance Criteria

- Valid PGN imports successfully and is persisted
- Invalid PGN blocks persistence with clear feedback
- Repeat import is idempotent by hash
- Chess.com archive import requires an explicit month range and skips duplicate games by hash
- Import page reads the Chess.com username from Backoffice-owned settings and does not edit it locally
- Signed-out or offline import attempts fail fast with explicit messaging
- Root checks remain green:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Current route-level UI gate:
  - `apps/web/src/routes/import.test.tsx`
