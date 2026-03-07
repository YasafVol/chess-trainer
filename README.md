# Chess Trainer

Chess Trainer is a web chess study app with a local-first runtime backed by IndexedDB. The repository contains the Vite frontend in `apps/web` and shared chess-domain logic in `packages/chess-core`.

## Runtime

- React + Vite
- TanStack Router
- IndexedDB-backed mock storage for games, analysis, and puzzles
- Browser-side Stockfish workers for analysis
- Shared chess-domain utilities in [`packages/chess-core`](/C:/Prog/chess-trainer/packages/chess-core)
- Vercel deployment wiring via [`vercel.json`](/C:/Prog/chess-trainer/vercel.json)

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

No auth or backend setup is required for the current runtime. Run:

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

No environment variables are required for the current mock runtime.

Future Convex/auth env placeholders are documented in [`apps/web/.env.example`](/C:/Prog/chess-trainer/apps/web/.env.example), but they are not used by the running app yet.

## Verification

The current web app passes:

- TypeScript typecheck in `apps/web`
- Production Vite build in `apps/web`
- Node test suite covering analysis planning and lifecycle logic in `apps/web`
- Root `npm run build` routed through the web app

## Notes

- Mock runtime and reactive local storage live in [`apps/web/src/lib/mockData.ts`](/C:/Prog/chess-trainer/apps/web/src/lib/mockData.ts).
- IndexedDB schema and repositories live under [`apps/web/src/lib/storage`](/C:/Prog/chess-trainer/apps/web/src/lib/storage).
- Convex backend scaffolding still lives in [`apps/web/convex`](/C:/Prog/chess-trainer/apps/web/convex), but it is not on the active runtime path.
- The current puzzle generation path uses the persisted primary PV from analysis. A deeper targeted `MultiPV=3` extraction pass is still deferred.

## Documentation

- FITL docs index: [`docs/README.md`](/C:/Prog/chess-trainer/docs/README.md)
- Quality and verification docs: [`docs/quality/README.md`](/C:/Prog/chess-trainer/docs/quality/README.md)
- Decisions and known issues: [`docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md`](/C:/Prog/chess-trainer/docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md)
- Product plans and transition specs: [`Spec/`](/C:/Prog/chess-trainer/Spec)
