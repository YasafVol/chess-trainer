# Known Issues

Last updated: 2026-04-03

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

### 5. Production SPA deep links return host-level 404s

- Status: open
- Severity: high
- Scope: production routing and deployment verification
- Summary: Stage 2 verification on 2026-04-03 confirmed that the deployed root URL loads, but a direct request to `/import` returns Vercel `404: NOT_FOUND` before the TanStack Router SPA can boot. Production deep-link handling must be fixed before authenticated smoke verification can continue.

## Related docs

- `OPEN_ISSUES_AND_COMPROMISES.md`
- `../quality/testing-guide.md`
- `../../Spec/WEB_APP_SMOKE_CHECKLIST.md`
