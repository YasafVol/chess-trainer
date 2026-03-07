# V1: Import and Persist PGN

## Business/User Intent

Allow a user to paste or upload PGN once and reliably persist a reusable local game record with metadata, deterministic identity, and immediate feedback.

## Impacted Layers

- Contracts: PGN, header, hash, and `GameRecord` contracts
- Domain: normalization, parsing, replay derivation, and hashing
- Application: import orchestration and duplicate handling
- Adapters: IndexedDB write paths
- Presentation: import form, preview list, and feedback
- Composition: route wiring

## Tests and Acceptance Criteria

- Valid PGN imports successfully and is persisted
- Invalid PGN blocks persistence with clear feedback
- Repeat import is idempotent by hash
- Root checks remain green:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
