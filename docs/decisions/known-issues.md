# Known Issues

Last updated: 2026-04-04

## Active issues

### 1. Route-local orchestration increases regression risk

- Status: open
- Severity: medium
- Scope: import, library, game, and puzzle routes
- Summary: route components still contain orchestration that should move into application services.

### 2. Move pane focus and scroll consistency

- Status: open
- Severity: low to medium
- Scope: replay and analysis presentation
- Summary: focus and scroll behavior around the active move pane still need a dedicated accessibility pass.

### 3. Deployment smoke automation is missing

- Status: open
- Severity: medium
- Scope: release and verification workflow
- Summary: Vercel deployment verification still depends on manual checks rather than automated smoke coverage.

### 4. Backoffice config is only partially persisted

- Status: open
- Severity: low
- Scope: analysis policy and puzzle-definition administration
- Summary: lazy background-analysis settings are now persisted locally, but the broader analysis and puzzle-definition constants exposed in backoffice are still hardcoded in source and need validated admin editing before they can move out of code.

### 5. Route-level UI coverage is still partial

- Status: open
- Severity: medium
- Scope: import, library, game, puzzle, and backoffice routes
- Summary: the first route-level UI coverage now exists for the import route, but the remaining major routes still rely on lower-level view tests plus manual smoke coverage.

## Related docs

- `OPEN_ISSUES_AND_COMPROMISES.md`
- `../quality/testing-guide.md`
- `../../Spec/WEB_APP_SMOKE_CHECKLIST.md`
