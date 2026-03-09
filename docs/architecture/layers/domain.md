# Domain Layer

## Purpose

Own chess-specific rules and pure decision logic independent of UI and storage technology.

## Features / Responsibilities

- PGN normalization, header extraction, and hashing
- Replay state derivation
- Analysis policy and plan generation
- Analysis run lifecycle rules
- Puzzle classification thresholds, definitions, and review scheduling

## Key Files

- `packages/chess-core/src/pgn.ts`
- `packages/chess-core/src/headers.ts`
- `packages/chess-core/src/hash.ts`
- `apps/web/src/domain/gameReplay.ts`
- `apps/web/src/domain/analysisPolicy.ts`
- `apps/web/src/domain/analysisPlan.ts`
- `apps/web/src/domain/analysisRunLifecycle.ts`
- `apps/web/src/domain/puzzles.ts`

## Tests / Quality Gates

- `apps/web/src/domain/analysisPlan.test.ts`
- `apps/web/src/domain/analysisRunLifecycle.test.ts`
- Gap:
  - add `gameReplay.ts` edge-case tests
  - add direct puzzle-domain tests around threshold definitions

## Open Risks / Deferred Items

- PGN import behavior still needs broader edge-case coverage for malformed multi-game input and promotions.
