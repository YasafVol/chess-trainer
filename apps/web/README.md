# Chess Trainer Web App

This is the active Chess Trainer product: a standalone React + Vite + TanStack Router web app with IndexedDB persistence and browser-side Stockfish analysis. It currently runs in a local-first mock mode so the full product flow can be tested without Convex or auth.

## Features

- TanStack Router SPA shell for import, library, game, and puzzle flows
- Paste or upload `.pgn` files
- Multi-game PGN splitting and selective import
- Local game library stored in IndexedDB
- Browser-side Stockfish analysis with persisted evaluations and PVs
- Automatic puzzle generation from mistakes and blunders
- Puzzle review with spaced repetition scheduling

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run test:tdd
npm run build
```

## Local run

No backend or auth setup is required for the active runtime.

```bash
npm install
npm run dev
```

## Environment

`apps/web/.env.example` contains future Convex/auth placeholders, but the current local-first runtime does not require any env vars.

## Deployment

Vercel uses the repo-level [`vercel.json`](../../vercel.json). The active deployment target is the standalone web app, not the deferred Convex/auth path.

## Notes

- Shared chess-domain code lives in [`packages/chess-core`](../../packages/chess-core).
- Active routing lives in [`apps/web/src/router.tsx`](src/router.tsx).
- Mock runtime and local reactive storage live in [`apps/web/src/lib/mockData.ts`](src/lib/mockData.ts).
- Deferred backend descriptors for future Convex/auth activation live in [`apps/web/src/lib/convex.ts`](src/lib/convex.ts).
- The current puzzle extraction flow uses the persisted primary PV from analysis. Targeted deeper `MultiPV=3` extraction is the next extension point.
