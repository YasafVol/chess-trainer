# Testing Guide

Last updated: 2026-03-27

## Automated checks

Run these from the repository root:

```bash
npm install
npm run typecheck
npm run test
npm run build
```

Current meaning:

- `npm run typecheck`: TypeScript build check for `apps/web`
- `npm run test`: Node-based TDD suite for analysis planning, lifecycle, and storage behavior in `apps/web`
- `npm run build`: production Vite build for the active standalone web app runtime

These checks validate the active authenticated Convex-backed code path at compile/build/test time. They do not require a live signed-in browser session, but manual browser verification for product flows still requires Convex/auth env setup.

## Web app manual checks

Use `../../Spec/WEB_APP_SMOKE_CHECKLIST.md` for the active browser runtime.

Recommended local loop:

```bash
npm run convex:dev
npm run dev
```

Verify:

- import and duplicate detection
- game replay controls and keyboard navigation
- worker initialization and analysis run/cancel flow
- persisted analysis and puzzle state after refresh

## Gaps

- No route-level UI tests for the web app yet.
- No deployment smoke automation yet; Vercel verification remains a manual release step.
