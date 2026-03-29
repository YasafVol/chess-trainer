# Application Layer

## Purpose

Coordinate domain rules to execute use-cases while remaining UI-agnostic where possible.

## Features / Responsibilities

- Import orchestration from validation through persistence
- Replay progression and current-ply transitions
- Analysis run lifecycle orchestration, including best-line search plus restricted played-move search when needed
- Scaled foreground-budget calculation and ply-based analysis progress reporting
- Library load and refresh orchestration
- Puzzle generation and review workflows
- Coordinate authenticated Convex-backed flows with explicit offline read-only behavior

## Key Files

- `apps/web/src/application/runGameAnalysis.ts`
- route-local orchestration currently in:
  - `apps/web/src/routes/import.tsx`
  - `apps/web/src/routes/game.tsx`
  - `apps/web/src/routes/library.tsx`
  - `apps/web/src/routes/puzzle.tsx`

## Tests / Quality Gates

- Failing use-case tests before new orchestration behavior
- Green-state regression tests after change
- Current gap:
  - import, library, and puzzle application services still need extraction from routes

## Open Risks / Deferred Items

- Route files still mix presentation and application logic.
- Retry and timeout policy for analysis should keep moving into dedicated application services.
- Import, library, and puzzle orchestration still need extraction from TanStack route components.
- Played-move analysis doubles some engine work for non-best moves; future optimization should consider caching or selective depth reduction.
