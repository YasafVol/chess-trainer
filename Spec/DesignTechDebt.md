# Web App Design and Technical Debt

This document tracks active design and technical debt for the local-first web app.

## Current debt areas

### 1. Route-local orchestration

- Import, library, game, and puzzle routes still carry application logic.
- Target: extract dedicated application services and add focused tests.

### 2. UI test coverage

- The project relies on domain tests plus manual smoke checks.
- Target: add route-level component tests for import, replay, analysis, and puzzle flows.

### 3. Deployment verification

- Deployment verification still depends on manual smoke steps.
- Target: add deployment smoke automation around the Vercel-hosted build.

### 4. IndexedDB migration coverage

- Storage migrations are present but lightly tested.
- Target: add migration fixtures before expanding the persisted schema further.

## Related docs

- `Spec/WEB_APP_BACKLOG.md`
- `Spec/WEB_APP_SMOKE_CHECKLIST.md`
- `docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md`
