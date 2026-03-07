# Chess Trainer

Chess Trainer is a web chess study app with a local-first runtime backed by IndexedDB. The repository contains the Vite frontend in `apps/web` and shared chess-domain logic in `packages/chess-core`.

## Runtime

- React + Vite standalone SPA
- TanStack Router for route composition, params, and navigation
- IndexedDB-backed local-first storage for games, analysis, and puzzles
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

No auth or backend setup is required for the active runtime. Run:

```bash
npm install
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

No environment variables are required for the active local-first runtime.

Future Convex/auth env placeholders are documented in [`apps/web/.env.example`](apps/web/.env.example), but they are deferred and not used by the shipped web app path.

## Verification

The current web app passes:

- TypeScript typecheck in `apps/web`
- Production Vite build in `apps/web`
- Node test suite covering analysis planning and lifecycle logic in `apps/web`
- Root `npm run build` routed through the standalone web app

## Notes

- Mock runtime and reactive local storage live in [`apps/web/src/lib/mockData.ts`](apps/web/src/lib/mockData.ts).
- TanStack Router composition lives in [`apps/web/src/router.tsx`](apps/web/src/router.tsx).
- IndexedDB schema and repositories live under [`apps/web/src/lib/storage`](apps/web/src/lib/storage).
- Convex/auth scaffolding still lives in [`apps/web/convex`](apps/web/convex), but it is deferred, not required for local development, and not on the active runtime path.
- Deferred backend descriptors for the active runtime live in [`apps/web/src/lib/convex.ts`](apps/web/src/lib/convex.ts).
- The current puzzle generation path uses the persisted primary PV from analysis. A deeper targeted `MultiPV=3` extraction pass is still deferred.

## Documentation

- FITL docs index: [`docs/README.md`](docs/README.md)
- Quality and verification docs: [`docs/quality/README.md`](docs/quality/README.md)
- Decisions and known issues: [`docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md`](docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md)
- Product plans and transition specs: [`Spec/`](Spec/)
