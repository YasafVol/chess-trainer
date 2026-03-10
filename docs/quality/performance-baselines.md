# Performance Baselines

Last verified: 2026-03-10

## Scope

Current performance expectations for the active web app.

## Web app baselines

- Entry JS bundle:
  - Last build: `dist/assets/index-BmNn06Va.js`
  - Size: `391.76 kB` raw, `121.83 kB` gzip
- CSS bundle:
  - Last build: `dist/assets/index-CLVDoTyS.css`
  - Size: `8.04 kB` raw, `2.39 kB` gzip
- Engine worker:
  - `dist/assets/engine.worker-WExjLAaS.js` at `5.51 kB`
- Stockfish assets:
  - Lite single-thread WASM: about `7.3 MB`
  - Full single-thread and isolated builds: about `113 MB` each

## Runtime guardrails

- Import flow should remain responsive for multi-game PGN paste and upload.
- Analysis must run in a worker and never block route interaction.
- Long-game analysis must respect ADR-004 sampling and budget rules.
- Mobile and non-isolated desktop should prefer the lite engine flavor to reduce memory and startup cost.

## Benchmark Harness

- Backoffice now includes an analysis benchmark page for the bundled `single.pgn` short game.
- The benchmark runs the real browser-worker pipeline, not a Node approximation.
- Reported aggregates include:
  - average and p95 run time
  - average and p95 per-ply time
  - average analyzed plies
  - retries per run
  - budget stop count
  - recommended per-game budget with 15% headroom
- Supported benchmark knobs:
  - engine flavor
  - depth
  - movetime
  - MultiPV
  - base foreground budget
  - foreground budget per ply
- Unsupported for v1 benchmark comparison:
  - `Threads`
  - `Hash`

## Follow-up debt

- Add repeatable bundle-size tracking for Vite outputs in CI.
- Add automated performance smoke checks for worker startup and cancel behavior.
- Revisit engine asset strategy before enabling heavier desktop analysis by default in production.
