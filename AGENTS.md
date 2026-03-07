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

## Repository focus

- The repository is web-only.
- Keep the repository web-only.
- Keep architecture and specs aligned with the active web runtime.

## Tooling

- Package manager: `npm`
- Frontend: React + Vite + TanStack Router
- Persistence: IndexedDB
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

## Quality policy

- Prefer automated checks first:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Use `Spec/WEB_APP_SMOKE_CHECKLIST.md` for manual browser smoke coverage.
