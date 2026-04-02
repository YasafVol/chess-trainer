# Chess Trainer

Chess Trainer is a web chess study app with a Convex-backed authenticated runtime, an IndexedDB read cache for offline viewing, and browser-side Stockfish analysis. The repository contains the Vite frontend in `apps/web` and shared chess-domain logic in `packages/chess-core`.

## Runtime

- React + Vite standalone SPA
- TanStack Router for route composition, params, and navigation
- Convex-backed storage for games, analysis, puzzles, and runtime settings
- IndexedDB read caching for offline view-only access and benchmark-only local storage
- Google auth via `@convex-dev/auth`
- Browser-side Stockfish workers for analysis
- Shared chess-domain utilities in [`packages/chess-core`](packages/chess-core)
- Vercel deployment wiring via [`vercel.json`](vercel.json)

## Commands

Run these from the repository root:

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

Vercel CLI commands:

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

## Local testing

Configure Convex and Google auth, then run:

```bash
npm install
npm run convex:dev
npm run dev
```

Then open the local Vite URL, usually `http://localhost:5173`.

The current build supports:

- Multi-game PGN paste and upload
- Split-and-preview import with duplicate detection
- Local game library in IndexedDB
- Browser-side Stockfish analysis with saved evals and PVs
- Automatic puzzle generation from mistakes and blunders
- Puzzle solving with spaced-repetition scheduling

## Environment

The active runtime uses the env vars documented in [`apps/web/.env.example`](apps/web/.env.example):

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `CONVEX_SITE_URL`
- `SITE_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

## Verification

The current web app passes:

- TypeScript typecheck in `apps/web`
- Production Vite build in `apps/web`
- Node test suite covering analysis planning and lifecycle logic in `apps/web`
- Root `npm run build` routed through the standalone web app

## Notes

- TanStack Router composition lives in [`apps/web/src/router.tsx`](apps/web/src/router.tsx).
- Active runtime composition and session/cache coordination live in [`apps/web/src/lib/runtimeGateway.tsx`](apps/web/src/lib/runtimeGateway.tsx).
- IndexedDB cache and benchmark repositories live under [`apps/web/src/lib/storage`](apps/web/src/lib/storage).
- Active Convex/auth functions live in [`apps/web/convex`](apps/web/convex).
- Typed client-side Convex function references live in [`apps/web/src/lib/convex.ts`](apps/web/src/lib/convex.ts).
- The current puzzle generation path uses the persisted primary PV from analysis. A deeper targeted `MultiPV=3` extraction pass is still deferred.

## Documentation

- Reinstatement rollout plan: [`REINSTATEMENT_ROLLOUT_PLAN.md`](REINSTATEMENT_ROLLOUT_PLAN.md)
- FITL docs index: [`docs/README.md`](docs/README.md)
- Quality and verification docs: [`docs/quality/README.md`](docs/quality/README.md)
- Decisions and known issues: [`docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md`](docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md)
- Product plans and transition specs: [`Spec/`](Spec/)
