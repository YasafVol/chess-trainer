# Presentation Layer

## Purpose
Render user interfaces, collect user intents, and display system state without embedding low-level infrastructure.

## Features / Responsibilities
- Plugin modal/settings UI and markdown chess viewer controls.
- Web import/library/game routes and board control surfaces.
- Analysis progress, status, and move/eval display.

## Data / Contracts
- UI input events -> application commands.
- Render models include game metadata, replay state, analysis summaries, and errors.

## Key Files
- `src/ui/ImportModal.ts`
- `src/ui/SettingsTab.ts`
- `src/ui/PromotionModal.ts`
- `main.ts` (rendered chess board UI and controls)
- `apps/web/src/routes/root.tsx`
- `apps/web/src/routes/import.tsx`
- `apps/web/src/routes/library.tsx`
- `apps/web/src/routes/game.tsx`
- `apps/web/src/styles.css`
- `styles.css`

## Internal Flows
- Modal/button/keyboard interactions trigger import, replay, and analysis actions.
- Route-level state updates repaint board, move list, and analysis sections.

## User-Facing Flows
- Import PGN and receive immediate feedback.
- Navigate moves with controls and keyboard.
- Start/cancel analysis and inspect evaluation at current ply.

## Tests / Quality Gates
- Manual plugin QA checklist (`QA_CHECKLIST.md`).
- Manual web smoke checklist (`Spec/WEB_APP_SMOKE_CHECKLIST.md`).
- Needed:
  - route-level component tests for import and game views
  - accessibility checks for move list focus and announcements.

## Open Risks / Deferred Items
- Plugin hotkey reliability remains open.
- Move pane focus/scroll behavior remains a deferred UX fix.
- Presentation currently owns application orchestration in multiple files.
