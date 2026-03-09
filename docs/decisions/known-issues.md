# Known Issues

Last updated: 2026-03-08

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

### 4. Backoffice config is read-only and code-backed

- Status: open
- Severity: low
- Scope: analysis policy and puzzle-definition administration
- Summary: the new backoffice route exposes shipped config values, but the values are still hardcoded in source and need persisted admin state plus validation before edits are enabled.

## Related docs

- `OPEN_ISSUES_AND_COMPROMISES.md`
- `../quality/testing-guide.md`
- `../../Spec/WEB_APP_SMOKE_CHECKLIST.md`
