# Reinstatement Rollout Plan

Last updated: 2026-04-04

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

- Completed on 2026-04-03 against production deployment `dpl_8cEd87oCvyWRZXPFDHZvk2oir77q` for commit `fc0ee21ec59a31cc35727e75d4d97eecb035a98b`.

Captured evidence:

- Deployment status: `READY` on production for commit `fc0ee21ec59a31cc35727e75d4d97eecb035a98b`.
- Vercel build logs confirmed the deployment still used Node `20.x` because of the repo `engines.node` setting.
- Browser verification:
  - `/`, `/library`, `/puzzles`, and `/backoffice` all loaded successfully through the temporary Vercel share URL.
  - Each route rendered the expected authenticated entry surface (`Chess Trainer Web` with `Continue with Google`) instead of returning a host-level `404`.
  - The previous deep-link failure was resolved by the Vercel SPA rewrite in `vercel.json`.
- Local verification:
  - `npm run typecheck` passed.
  - `npm run test` passed with 116 tests passing.
  - `npm run build` passed.

Next action:

- Begin Stage 3 controlled feature reinstatement.
- Keep `Spec/WEB_APP_SMOKE_CHECKLIST.md` as the manual signed-in browser checklist when a Google-authenticated session is available.

### Stage 3: Controlled feature reinstatement

Scope:

- Reintroduce approved follow-on product changes in small batches.
- Keep each batch isolated from deploy/package-manager changes.
- Update FITL docs, tests, and rollout notes alongside each reinstated slice.

Exit criteria:

- Each reinstated slice passes repo checks and preview verification.
- Deployment behavior remains anchored to the Stage 2 baseline path.

Status:

- Batch 1 route-aware auth-gate rollout completed on 2026-04-03.
- The follow-on deploy-safety slice that ships only the lite Stockfish bundle by default completed on 2026-04-03.

Batch 1 scope:

- Rework the shared signed-out shell into a route-aware auth gate for `/`, `/library`, `/puzzles`, `/backoffice`, and `/game/$gameId`.
- Keep the slice limited to presentation/composition-adjacent UI, copy, and tests.
- Do not change dependencies, lockfiles, routes, backend behavior, or deployment config.

Batch 1 evidence:

- Local verification passed with `npm run typecheck`, `npm run test`, and `npm run build`.
- Preview deployment `dpl_GEq7xy18eiVCjMPJF8RdhB2Z1vN8` was created for branch `codex-stage3-auth-gate` and commit `fc8da75074ec430324f045f41ad03cb126bfa766`.
- The preview build stayed on Node `20.x` and used the root `vercel.json` install command.
- Preview environment parity was restored by adding `CONVEX_DEPLOY_KEY`, after which preview deploy `chess-trainer-iaqss83r0-yasafs-projects.vercel.app` reached `READY`.
- Production deploy `chess-trainer-lemon.vercel.app` also reached `READY` from commit `5a59ca7297c0572a3f6dbd08ae863606c9c30322`.
- The shipped build now bundles only `stockfish-18-lite-single`, avoiding the prior 100MB+ WASM assets while preserving a future engine-flavor expansion path in source.

Next action:

- Start the next Stage 3 quality slice by adding route-level UI coverage, beginning with the import route and then extending to library, game, puzzle, and backoffice routes.
- Continue extracting route-local orchestration into application-layer services once route-level coverage exists around the highest-risk flows.

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
