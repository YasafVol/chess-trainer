# Presentation Layer

## Purpose

Render user interfaces, collect user intents, and display system state.

## Features / Responsibilities

- Import, library, game, puzzle-list, and puzzle-solve routes
- Analysis progress, move/eval display, and puzzle review feedback
- Board controls, move list, and keyboard interactions

## Key Files

- `apps/web/src/routes/root.tsx`
- `apps/web/src/routes/import.tsx`
- `apps/web/src/routes/library.tsx`
- `apps/web/src/routes/game.tsx`
- `apps/web/src/routes/puzzles.tsx`
- `apps/web/src/routes/puzzle.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/components/InlineLoader.tsx`
- `apps/web/src/components/useDelayedBusy.ts`

## Tests / Quality Gates

- Manual smoke checklist: `Spec/WEB_APP_SMOKE_CHECKLIST.md`
- Needed:
  - route-level component tests
  - accessibility checks for move-list focus and announcements

## Open Risks / Deferred Items

- Presentation still owns too much orchestration in several route files.
- Move-pane focus and scroll behavior still need a dedicated accessibility pass.
