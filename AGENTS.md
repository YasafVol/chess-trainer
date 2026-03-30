# Chess Trainer Web App

## Project overview

- Active product: standalone web app under `apps/web`.
- Supporting shared package: `packages/chess-core`.
- Deployment target: Vercel-hosted SPA with offline-capable local storage.
- Analysis runtime: browser-side Stockfish worker.

## FITL Nav governance

Canonical layer order:
1. Contracts
2. Domain
3. Application
4. Adapters
5. Presentation
6. Composition

Dependency rule:
- Outer depends inward only.
- `Composition -> Presentation -> Adapters -> Application -> Domain -> Contracts`

TDD rule:
1. Red
2. Green
3. Refactor

Definition of done:
1. Code integrated.
2. Tests added at the right layer and passing.
3. FITL docs updated in `docs/`.

## FITL-first workflow

- Before planning or implementing a non-trivial change, read the relevant FITL docs first.
- Start with `docs/README.md`, then read the vertical doc for the feature area, then the relevant module doc, then any linked decision/risk docs that affect the change.
- Do not plan or implement from route/code inspection alone when a FITL doc already exists for that area.
- If the requested work spans multiple feature areas, read all relevant vertical docs before finalizing a plan.
- If the existing FITL docs are missing, stale, or split in a confusing way, call that out and fix the docs as part of the work.

### FITL doc map

| Product area | Primary FITL doc | Supporting docs |
| --- | --- | --- |
| Import | `docs/architecture/verticals/v1-import-and-persist-pgn.md` | `docs/modules/web-app.md`, `docs/quality/testing-guide.md` |
| Replay/navigation | `docs/architecture/verticals/v2-replay-and-navigation.md` | `docs/modules/web-app.md` |
| Engine analysis/annotations | `docs/architecture/verticals/v3-engine-analysis-and-annotations.md` | `docs/reference/stockfish-analysis-capabilities.md`, `docs/quality/performance-baselines.md` |
| Library | `docs/architecture/verticals/v4-library-and-game-lifecycle.md` | `docs/modules/web-app.md`, `docs/decisions/known-issues.md` |
| Puzzles | `docs/architecture/verticals/v5-puzzle-generation-and-review.md` | `docs/modules/web-app.md`, `docs/quality/testing-guide.md` |
| Game view/workbench | `docs/architecture/verticals/v6-game-view-and-analysis-workbench.md` | `docs/architecture/verticals/v2-replay-and-navigation.md`, `docs/architecture/verticals/v3-engine-analysis-and-annotations.md` |
| Backoffice/benchmarking | `docs/architecture/verticals/v7-backoffice-and-benchmarking.md` | `docs/modules/web-app.md`, `docs/quality/performance-baselines.md`, `docs/decisions/ANALYSIS_BENCHMARK_2026-03-10.md` |
| Design system/styling | `docs/architecture/layers/presentation.md` | `apps/web/src/index.css` (theme), `apps/web/src/styles.css` (domain CSS) |
| Layer rules/governance | `docs/README.md` | `docs/architecture/layers/*.md`, `docs/architecture/LAYER_X_FEATURE_MATRIX.md` |

## Repository focus

- The repository is web-only.
- Keep the repository web-only.
- Keep architecture and specs aligned with the active web runtime.

## Tooling

- Package manager: `npm`
- Frontend: React + Vite + TanStack Router
- Styling: Tailwind CSS v4 (`@tailwindcss/vite` plugin, CSS-first config in `apps/web/src/index.css`) + shadcn/ui component library (`apps/web/src/components/ui/`)
- Icons: `lucide-react`
- Persistence: IndexedDB + Convex (serverless backend)
- Auth: Google via `@convex-dev/auth`
- Shared logic: `packages/chess-core`

## Commands

From the repo root:

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

Vercel:

```bash
npm run vercel:whoami
npm run vercel:login
npm run vercel:link
npm run vercel:pull
npm run vercel:dev
npm run vercel:build
npm run vercel:deploy
npm run vercel:deploy:prod
```

## Documentation policy

- Update FITL docs in `docs/architecture/`, `docs/modules/`, and `docs/decisions/` for non-trivial changes.
- Keep product planning docs in `Spec/` web-focused.
- If a doc is superseded, replace it with an updated web-only equivalent or remove it if it no longer serves the product.
- Keep FITL Nav framework extraction and migration work scoped to `fitl-nav/`.
- For FITL Nav extraction work, read `fitl-nav/README.md` and `fitl-nav/EXTRACTION_PLAN.md` before making structural changes.

## Quality policy

- Prefer automated checks first:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Use `Spec/WEB_APP_SMOKE_CHECKLIST.md` for manual browser smoke coverage.
