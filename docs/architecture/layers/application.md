# Application Layer

## Purpose
Coordinate domain rules to execute user use-cases while remaining UI-agnostic where possible.

## Features / Responsibilities
- Orchestrate PGN import from validation through persistence.
- Orchestrate replay progression and current-ply state transitions.
- Orchestrate analysis run lifecycle (start, retry, cancel, finalize).
- Coordinate refresh/load lifecycle for game and analysis summaries.

## Data / Contracts
- Import command/submit inputs -> validated normalized PGN + metadata -> persisted record.
- Analysis run commands -> run status transitions (`queued/running/completed/failed/cancelled`).
- Replay commands -> current ply, autoplay, and manual branch state.

## Key Files
- `main.ts` (`processPgnImport`, `analyzeCurrentGame`, `analyzeGameAsync`)
- `apps/web/src/routes/import.tsx` (current import orchestration)
- `apps/web/src/routes/game.tsx` (`runAnalysis`, cancellation/retry flow)
- `apps/web/src/routes/library.tsx` (load sequence)

## Internal Flows
- Plugin: modal submit -> validator -> metadata -> note write -> optional async analysis.
- Web: import submit -> hash/replay derivation -> IndexedDB save -> route transition.
- Web analysis: plan generation -> worker requests -> persisted per-ply snapshots.

## User-Facing Flows
- Import success/failure notices and saved game availability.
- Deterministic analysis progress state with cancel and rerun semantics.

## Tests / Quality Gates
- Required for each new use-case orchestration path:
  - failing use-case test before implementation
  - green-state regression test after change
- Current gaps:
  - plugin orchestration lacks automated tests
  - web `game.tsx` run lifecycle tested mainly by smoke checklist.

## Open Risks / Deferred Items
- Application logic currently embedded in presentation files (`main.ts`, `game.tsx`); extract to dedicated services to reduce regression risk.
- Retry and timeout policy is encoded inline; centralize in application service before expanding analysis features.
