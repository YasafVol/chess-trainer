# Stockfish Analysis Capabilities

Last updated: 2026-03-07

## Scope

Reference summary of the analysis data currently surfaced by the browser-worker engine path in this repository.

## Data currently used by the product

- Best move in UCI form
- Principal variation for the primary line
- Evaluation:
  - centipawns
  - mate scores
- Search metadata:
  - depth
  - nodes
  - elapsed time
- Per-ply run metadata:
  - status
  - retries used
  - engine flavor
  - completion or cancellation reason

## How the web app uses it

- `apps/web/src/application/runGameAnalysis.ts` orchestrates per-ply analysis runs.
- `apps/web/src/engine/engineClient.ts` transports worker messages.
- `apps/web/src/routes/game.tsx` renders progress, current-ply evaluation, and run summaries.
- `apps/web/src/lib/mockData.ts` persists runs and per-ply results locally.
- Puzzle generation currently uses the persisted primary PV and eval swing, not a deeper targeted extraction pass.

## Deferred capabilities

- richer `MultiPV` extraction for puzzle generation
- explanatory evaluation breakdowns
- stronger automated compatibility tests around worker contract handling

## Related docs

- `../architecture/verticals/v3-engine-analysis-and-annotations.md`
- `../../Spec/adr/ADR-002-stockfish-distribution.md`
- `../../Spec/adr/ADR-004-mobile-performance-guardrails.md`
