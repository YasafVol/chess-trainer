# Chess Trainer Web App

This is the active Chess Trainer product. It currently runs in a mock mode backed by IndexedDB so the full product flow can be tested locally before Convex and auth are turned on.

## Features

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

No backend or auth setup is required right now.

```bash
npm install
npm run dev
```

## Environment

`apps/web/.env.example` contains future Convex/auth placeholders, but the current mock runtime does not require any env vars.

## Deployment

Vercel uses the repo-level [`vercel.json`](/C:/Prog/chess-trainer/vercel.json). The current active deployment target is the mock web app, not the deferred Convex/auth path.

## Notes

- Shared chess-domain code lives in [`packages/chess-core`](/C:/Prog/chess-trainer/packages/chess-core).
- Mock runtime and local reactive storage live in [`apps/web/src/lib/mockData.ts`](/C:/Prog/chess-trainer/apps/web/src/lib/mockData.ts).
- The current puzzle extraction flow uses the persisted primary PV from analysis. Targeted deeper `MultiPV=3` extraction is the next extension point.
