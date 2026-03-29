# V7: Backoffice and Benchmarking

## Business/User Intent
Give maintainers an operational surface for inspecting shipped analysis and puzzle constants, a small persisted control surface for lazy library analysis runtime settings and Chess.com sync identity/cadence, a repeatable benchmark harness for comparing real browser-worker analysis cost on the bundled PGN fixture, and a FITL explorer that makes intent, feature, implementation, and tooling relationships visible before planning changes.

## Flow Narrative
1. Maintainer opens the backoffice route.
2. System loads the persisted lazy-analysis runtime settings, Chess.com sync settings, and puzzle playback settings, then renders editable controls for enablement, scan interval, username, cadence, and playback speed.
3. System renders the remaining shipped source-backed constants grouped into readable sections.
4. Maintainer opens the analysis benchmark route from backoffice.
5. System loads the bundled `single.pgn` fixture, builds benchmark scenarios, and runs repeated analysis through the real worker path.
6. System reports scenario-level timing summaries, projected full-run runtime, safety-stop counts, and recommended derived safety budgets.
7. Maintainer opens `/backoffice/fitl-map` from backoffice.
8. System loads the generated FITL graph snapshot, lands on a project-level overview of intents and verticals, then deepens into architecture or implementation only after the maintainer focuses a vertical or tool.
9. System exposes a structured copyable AI change brief for the current focus, including relevant docs, files, tools, constraints, and validation commands.

## Impacted Layers
- Contracts: benchmark scenario, repetition, summary, progress, config-section contracts, persisted lazy-analysis plus Chess.com sync plus puzzle-playback runtime config, and FITL graph node/edge/search contracts.
- Domain: movetime-first analysis policy, lazy-analysis config normalization, Chess.com username and cadence normalization, archive-cursor persistence rules, puzzle playback config normalization, benchmark scenario definitions, summary aggregation, blocked-knob rules, FITL graph filtering, focus-depth dossier generation, and AI-brief export formatting.
- Application: shared analysis-coordinator config updates, Chess.com sync-coordinator updates, puzzle runtime setting consumption, repeated benchmark execution, step-level error reporting, and failure normalization. FITL explorer remains route-driven and read-only in v1.
- Adapters: `appMeta`-backed runtime config storage, browser fetches to Chess.com archive endpoints, isolated benchmark IndexedDB database, benchmark repositories, engine-worker client wiring, and the build-time FITL graph extractor plus tooling manifest merge.
- Presentation: `/backoffice` runtime controls plus config sections, `/backoffice/analysis-benchmark` scenario cards, status/failure surfaces, benchmark results table, and `/backoffice/fitl-map` balanced map-plus-dossier workspace with route-backed search and depth controls.
- Composition: route registration for all backoffice pages and linkage from the admin landing page.

## Execution Order Per Layer
1. Tests (Red): benchmark aggregation, storage isolation, and backoffice presentation expectations fail first.
2. Contracts: define scenario/result/progress/config-section shapes.
3. Domain: codify benchmark sweeps, summary math, and visible-vs-blocked knob rules.
4. Application: run repeated benchmark scenarios against the real analysis pipeline with explicit failure steps.
5. Adapters: isolate benchmark writes from the main game-analysis history and normalize storage errors.
6. Presentation: render config inspection, benchmark controls, progress updates, and result summaries.
7. Composition: expose routes and keep benchmark navigation discoverable from backoffice.
8. Tests (Green): benchmark, storage, and presentation coverage passes.
9. Refactor: move toward persisted admin config once validation and edit flows exist.
10. Docs updates: keep performance, decisions, and module docs aligned with the admin surface.

## Tests and Acceptance Criteria
- Acceptance criteria:
  - Backoffice can enable or disable lazy library analysis, persist the configured scan interval through Convex-backed `appMeta`, save the Chess.com username plus daily/weekly cadence, and adjust persisted puzzle playback speed.
  - Chess.com sync settings remain the only source of truth for the username used by the import page.
  - Backoffice still shows the shipped analysis and puzzle constants separately from the editable lazy-analysis runtime control.
  - Benchmark runs use the real worker pipeline and the bundled `single.pgn` fixture.
  - Benchmark failures show scenario, repetition, and failing step instead of opaque errors.
  - Benchmark writes never pollute normal library analysis history.
  - Benchmark results expose projected full-run runtime and recommended derived safety budget for the tested game.
  - FITL explorer lands on a project summary that shows the project node, all seven intents, and all seven verticals without global tooling or file clutter.
  - FITL explorer continues to support hidden deferred surfaces, but `Convex/Auth` is modeled as an active runtime concern and remains visible when relevant.
  - Selecting V3 or V6 and switching to implementation depth reveals Stockfish plus the worker/runtime implementation references needed for analysis work.
  - Selecting V7 reveals Vercel as a deploy-time concern rather than a runtime dependency, while `Convex/Auth` appears as an active persistence and auth concern.
  - Implementation depth is blocked until the maintainer focuses a vertical or tool.
- Tests/gates:
  - `apps/web/src/domain/analysisBenchmark.test.ts`
  - `apps/web/src/application/runAnalysisBenchmark.test.ts`
  - `apps/web/src/lib/storage/repositories/benchmarkAnalysisRepo.test.ts`
  - `apps/web/src/presentation/analysisBenchmarkView.test.ts`
  - `apps/web/src/presentation/backofficeView.test.ts`
  - `apps/web/scripts/fitlGraphSource.test.mjs`
  - `apps/web/src/domain/fitlGraph.test.ts`
  - `apps/web/src/presentation/fitlMapView.test.ts`
  - `apps/web/src/presentation/FitlMapExplorer.test.tsx`

## Risk/Deferment References
- Backoffice now persists lazy-analysis runtime settings locally, but the broader analysis and puzzle constants remain source-backed and read-only.
- Chess.com sync remains browser-resident only; it checks for new archive months while the app is open and does not introduce server cron or remote persistence.
- Benchmark coverage is intentionally narrow: one bundled short game and a fixed scenario sweep.
- Threads and Hash remain excluded from benchmark comparison until the worker runtime accepts and applies those options.
- FITL explorer v2 is intentionally docs-driven and does not infer arbitrary code dependencies outside the curated FITL docs, module maps, layer matrix, and tooling manifest.
