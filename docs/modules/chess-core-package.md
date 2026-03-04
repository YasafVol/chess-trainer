# Module: Shared Chess Core Package

## Scope
Reusable package under `packages/chess-core` shared by web runtime (and candidate for plugin convergence).

## Layer Placement
- Contracts:
  - package public API in `packages/chess-core/src/index.ts`
  - `PgnHeaders` type in `packages/chess-core/src/headers.ts`
- Domain:
  - `packages/chess-core/src/pgn.ts`
  - `packages/chess-core/src/headers.ts`
  - `packages/chess-core/src/hash.ts`
- Application:
  - none currently (pure utility/domain package)
- Adapters:
  - none (no storage/network/UI coupling)
- Presentation:
  - none
- Composition:
  - package build/export wiring in `packages/chess-core/package.json`

## Notes
- This module is the preferred home for shared pure logic currently duplicated in plugin code.
