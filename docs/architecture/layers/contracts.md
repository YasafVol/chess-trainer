# Contracts Layer

## Purpose

Define stable data shapes and protocol boundaries shared across the web app and shared chess-core package.

## Features / Responsibilities

- Define PGN parsing and header contracts.
- Define persisted game, run, ply, puzzle, and attempt shapes.
- Define board adapter and engine message contracts, including board resize, drop interactions, and move-restricted analysis requests.

## Key Files

- `packages/chess-core/src/index.ts`
- `packages/chess-core/src/headers.ts`
- `apps/web/src/domain/types.ts`
- `apps/web/src/board/BoardAdapter.ts`
- `apps/web/src/engine/engineClient.ts`

## Tests / Quality Gates

- Contract behavior is exercised through:
  - `apps/web/src/domain/analysisPlan.test.ts`
  - `apps/web/src/domain/analysisRunLifecycle.test.ts`
  - `apps/web/src/application/runGameAnalysis.test.ts`
- Gap:
  - add explicit import-contract and puzzle-contract tests

## Open Risks / Deferred Items

- Some contract ownership still lives in route-adjacent code instead of dedicated contract modules.
- Runtime contracts still avoid direct dependency on generated Convex package types; adapter mappings remain the boundary for backend transport details.
- Browser board integration depends on the contract exposing enough lifecycle hooks for late-mounted route hosts.
- Move-quality fields remain optional on persisted ply analysis so older IndexedDB rows can still be read without migration errors.
