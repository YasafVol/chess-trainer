# Chess Trainer Web App

This is the active Chess Trainer product: a standalone React + Vite + TanStack Router web app with Convex-backed persistence, Google auth via `@convex-dev/auth`, an IndexedDB read cache, and browser-side Stockfish analysis.

## Features

- TanStack Router SPA shell for import, library, game, and puzzle flows
- Paste or upload `.pgn` files
- Multi-game PGN splitting and selective import
- Convex-backed game library mirrored into IndexedDB for offline read-only access
- Browser-side Stockfish analysis with persisted evaluations and PVs
- Automatic puzzle generation from analyzed mistakes and blunders
- Puzzle review with spaced repetition scheduling persisted through Convex

## Commands

```bash
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run test:tdd
pnpm run build
```

## Local run

Convex and Google auth must be configured for the active runtime.

```bash
pnpm install
pnpm run convex:dev
pnpm run dev
```

## Environment

`apps/web/.env.example` lists the active required env vars:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `CONVEX_SITE_URL`
- `SITE_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

## Deployment

Vercel uses the repo-level [`vercel.json`](../../vercel.json). Production builds install from `apps/web` with `npm ci --ignore-scripts`, then deploy Convex and the frontend together through the app-local `convex`, `tsc`, and `vite` binaries.
Set `CONVEX_DEPLOY_KEY` in the Vercel project before the first production deployment.
Vercel installs dependencies from the app-local `package-lock.json` to avoid live package-manager resolution during deploys.

## Notes

- Shared chess-domain code lives in [`packages/chess-core`](../../packages/chess-core).
- Active routing lives in [`apps/web/src/router.tsx`](src/router.tsx).
- Active runtime composition flows through [`apps/web/src/lib/runtimeGateway.tsx`](src/lib/runtimeGateway.tsx).
- Typed Convex function references live in [`apps/web/src/lib/convex.ts`](src/lib/convex.ts).
- The shadcn utility stylesheet is vendored in [`apps/web/src/shadcn-tailwind.css`](src/shadcn-tailwind.css); add new shadcn components with `npx shadcn@latest add ...` instead of relying on the `shadcn` package as an app dependency.
- The current puzzle extraction flow uses the persisted primary PV from analysis. Targeted deeper `MultiPV=3` extraction is the next extension point.
