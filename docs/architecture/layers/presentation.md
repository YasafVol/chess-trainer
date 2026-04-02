# Presentation Layer

## Purpose

Render user interfaces, collect user intents, and display system state.

## Features / Responsibilities

- Import, library, game, puzzle-list, puzzle-solve, and backoffice routes
- Analysis progress, move/eval display, eval bar, eval graph, and puzzle review feedback
- Read-only admin config inspection for analysis depths, limits, and classification definitions
- Board controls, SAN/NAG-style move annotations, late-mounted board-host wiring, and keyboard interactions
- TanStack Router links, params, and route-driven screen composition
- Shared signed-out auth-gate messaging that keeps deep-linked entry routes contextual before Google sign-in

## Key Files

- `apps/web/src/routes/root.tsx`
- `apps/web/src/routes/import.tsx`
- `apps/web/src/routes/library.tsx`
- `apps/web/src/routes/game.tsx`
- `apps/web/src/routes/puzzles.tsx`
- `apps/web/src/routes/puzzle.tsx`
- `apps/web/src/routes/backoffice.tsx`
- `apps/web/src/presentation/AuthGateView.tsx`
- `apps/web/src/presentation/authGateModel.ts`
- `apps/web/src/presentation/analysisView.ts`
- `apps/web/src/presentation/backofficeView.ts`
- `apps/web/src/styles.css`
- `apps/web/src/components/InlineLoader.tsx`
- `apps/web/src/components/useDelayedBusy.ts`

## Tests / Quality Gates

- Manual smoke checklist: `Spec/WEB_APP_SMOKE_CHECKLIST.md`
- Needed:
  - route-level component tests
  - accessibility checks for move-list focus and announcements
- Current route-adjacent coverage verifies replay rendering without a synthetic start row, the eval-bar/graph helper state, and the backoffice config sections derived from hardcoded source constants.

## Open Risks / Deferred Items

- Presentation still owns too much orchestration in several route files.
- Move-pane focus and scroll behavior still need a dedicated accessibility pass.
- Backoffice values are still read-only and sourced from code constants rather than persisted admin state.
