# Performance Baselines

Last verified: 2026-03-07

## Scope

Current performance expectations for the active web app.

## Web app baselines

- Entry JS bundle:
  - Last build: `dist/assets/index-iz4VTfkk.js`
  - Size: `368.47 kB` raw, `115.97 kB` gzip
- CSS bundle:
  - Last build: `dist/assets/index-D2m6SoTp.css`
  - Size: `3.90 kB` raw, `1.39 kB` gzip
- Engine worker:
  - `dist/assets/engine.worker-CglEvGHJ.js` at `5.26 kB`
- Stockfish assets:
  - Lite single-thread WASM: about `7.3 MB`
  - Full single-thread and isolated builds: about `113 MB` each

## Runtime guardrails

- Import flow should remain responsive for multi-game PGN paste and upload.
- Analysis must run in a worker and never block route interaction.
- Long-game analysis must respect ADR-004 sampling and budget rules.
- Mobile and non-isolated desktop should prefer the lite engine flavor to reduce memory and startup cost.

## Follow-up debt

- Add repeatable bundle-size tracking for Vite outputs in CI.
- Add automated performance smoke checks for worker startup and cancel behavior.
- Revisit engine asset strategy before enabling heavier desktop analysis by default in production.
