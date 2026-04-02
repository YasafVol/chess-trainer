# Reinstatement Rollout Plan

Last updated: 2026-04-03

## Objective

Reinstate follow-on product work from the current `master` baseline without destabilizing the last known Vercel-working deployment path.

## Starting Point

- `master` is intentionally rolled back to the last known Vercel-working state equivalent to `e4b3de7` (`feat: wire convex auth and storage`).
- The rollout starts from the current repository state, not from any intermediate deploy/package-manager experiment.

## Hard Constraints

- Keep Node on `20.x`.
- Keep npm workspaces as the package-management model.
- Keep the current root `vercel.json` unchanged.
- Do not reintroduce the deploy/package-manager experiments from `ed8b2bd..b50a39b`.
- Use stepwise rollout gates: docs and planning first, then preview verification, then narrower feature reinstatement, then production promotion.

## Explicitly Excluded Experiment Set

The following experiment themes remain out of scope for this rollout unless a later dedicated plan explicitly replaces this document:

- Node `22.x` upgrades.
- `pnpm` and `corepack` changes for Vercel installs.
- App-local install or binary-resolution workarounds for Vercel.
- Alternative Vercel install/build command experiments introduced in `ed8b2bd..b50a39b`.

## Stages

### Stage 1: Documentation and rollout guardrails

Scope:

- Create and publish the rollout plan and related FITL/planning references.
- Confirm the repo still matches the `e4b3de7`-equivalent baseline.
- Re-run unaffected repository checks to prove the documentation-only change did not disturb the shipped baseline.

Deliverables:

- This plan document.
- FITL docs updated so the plan is discoverable from the normal documentation path.
- No runtime, dependency, lockfile, route, styling, or deployment-config changes.

Exit criteria:

- Documentation changes are merged cleanly.
- `npm run typecheck`, `npm run test`, and `npm run build` still pass from the repo root.
- The repository remains ready for a baseline preview or production deploy because deployment inputs are unchanged.

### Stage 2: Baseline deploy verification

Scope:

- Run a preview deploy from the unchanged baseline.
- Verify the deployed app matches the expected authenticated Convex-backed runtime path.
- Capture manual smoke results using `Spec/WEB_APP_SMOKE_CHECKLIST.md`.

Exit criteria:

- Preview deploy succeeds without altering Node, npm workspace wiring, or `vercel.json`.
- Smoke coverage passes for import, library, replay, analysis, and puzzle flows.
- Any issues found are documented before additional reinstatement work proceeds.

Status:

- Verification started on 2026-04-03 against production deployment `dpl_33mzJP95m5tBEo311VSnDTxg1m2q` for commit `7e8e67ebbffd58a3c2bd292200cd58467fb507bf`.
- The deployed root URL loads and renders the expected authenticated entry surface (`Chess Trainer Web` with `Continue with Google`).
- Stage 2 is not complete because the first broken boundary appears before authenticated smoke coverage can continue: direct route entry to `/import` returns Vercel `404: NOT_FOUND` instead of serving the SPA shell.

Captured evidence:

- Deployment status: `READY` on production for commit `7e8e67ebbffd58a3c2bd292200cd58467fb507bf`.
- Browser verification:
  - `/` loaded successfully through the temporary Vercel share URL and rendered the Google auth entry point.
  - `/import` returned `404: NOT_FOUND` at the hosting layer, so the TanStack Router app never booted for that direct route.

Next action:

- Fix production SPA deep-link handling before continuing with authenticated import/library/game smoke coverage or any Stage 3 reinstatement work.

### Stage 3: Controlled feature reinstatement

Scope:

- Reintroduce approved follow-on product changes in small batches.
- Keep each batch isolated from deploy/package-manager changes.
- Update FITL docs, tests, and rollout notes alongside each reinstated slice.

Exit criteria:

- Each reinstated slice passes repo checks and preview verification.
- Deployment behavior remains anchored to the Stage 2 baseline path.

### Stage 4: Production promotion

Scope:

- Promote the verified preview state to production.
- Record the exact promoted commit and verification evidence.

Exit criteria:

- Production deploy succeeds on the unchanged deployment path.
- Promotion notes capture commit SHA, verification results, and any follow-up work.

## Stage 1 Status

Current status: completed on 2026-04-03.

Completion evidence:

- Rollout and FITL discovery docs updated without changing runtime inputs.
- Baseline verification passed with `npm run typecheck`, `npm run test`, and `npm run build`.
- No deploy/config/runtime changes are part of Stage 1.
