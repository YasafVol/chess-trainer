# Domain Layer

## Purpose
Own chess-specific rules and pure decision logic independent of UI and storage technology.

## Features / Responsibilities
- PGN normalization, header extraction, and deterministic hashing.
- Replay state derivation (moves + FEN timeline).
- Analysis policy and plan generation by game length.
- UCI output parsing to structured evaluation data.

## Data / Contracts
- PGN textual inputs -> normalized PGN and header map.
- Replay outputs -> SAN/UCI move list + FEN sequence.
- Analysis planning outputs -> per-ply depth schedule.
- Parsed UCI outputs -> evaluation, PV lines, statistics.

## Key Files
- `packages/chess-core/src/pgn.ts`
- `packages/chess-core/src/headers.ts`
- `packages/chess-core/src/hash.ts`
- `apps/web/src/domain/gameReplay.ts`
- `apps/web/src/domain/analysisPolicy.ts`
- `apps/web/src/domain/analysisPlan.ts`
- `stockfish-service/src/engine/UciParser.ts`
- `src/services/pgnValidator.ts`

## Internal Flows
- Import flow calls normalization -> validation -> header extraction.
- Replay flow converts PGN into deterministic ply/FEN progression.
- Analysis flow computes depth plan from total plies and tactical hints.
- Service parser maps raw engine text to typed analysis.

## User-Facing Flows
- Correct import validation and filename consistency.
- Accurate replay navigation and analysis summary outputs.

## Tests / Quality Gates
- Existing: `apps/web/src/domain/analysisPlan.test.ts`.
- Needed:
  - unit tests for `gameReplay.ts` edge cases (promotions, malformed PGN)
  - parser tests for `UciParser` against sample engine logs
  - plugin validator regression suite aligned with `Spec/samples/`.

## Open Risks / Deferred Items
- Plugin and shared-domain logic overlap (`src/services/pgnValidator.ts` vs `packages/chess-core`) creates divergence risk.
- Hash fallback algorithm is non-cryptographic fallback; acceptable for local use but needs explicit migration plan if exposed externally.
