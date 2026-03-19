# V7: Backoffice and Benchmarking

## Business/User Intent
Give maintainers an operational surface for inspecting shipped analysis and puzzle constants, a small persisted control surface for lazy library analysis runtime settings, and a repeatable benchmark harness for comparing real browser-worker analysis cost on the bundled PGN fixture.

## Flow Narrative
1. Maintainer opens the backoffice route.
2. System loads the persisted lazy-analysis runtime settings and puzzle playback settings, then renders editable controls for enablement, scan interval, and playback speed.
3. System renders the remaining shipped source-backed constants grouped into readable sections.
4. Maintainer opens the analysis benchmark route from backoffice.
5. System loads the bundled `single.pgn` fixture, builds benchmark scenarios, and runs repeated analysis through the real worker path.
6. System reports scenario-level timing summaries, projected full-run runtime, safety-stop counts, and recommended derived safety budgets.

## Impacted Layers
- Contracts: benchmark scenario, repetition, summary, progress, config-section contracts, and persisted lazy-analysis plus puzzle-playback runtime config.
- Domain: movetime-first analysis policy, lazy-analysis config normalization, puzzle playback config normalization, benchmark scenario definitions, summary aggregation, and blocked-knob rules.
- Application: shared analysis-coordinator config updates, puzzle runtime setting consumption, repeated benchmark execution, step-level error reporting, failure normalization, and progress event emission.
- Adapters: `appMeta`-backed runtime config storage, isolated benchmark IndexedDB database, benchmark repositories, and engine-worker client wiring.
- Presentation: `/backoffice` runtime controls plus config sections, `/backoffice/analysis-benchmark` scenario cards, status/failure surfaces, and benchmark results table.
- Composition: route registration for both backoffice pages and linkage from the admin landing page.

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
  - Backoffice can enable or disable lazy library analysis, persist the configured scan interval locally, and adjust persisted puzzle playback speed.
  - Backoffice still shows the shipped analysis and puzzle constants separately from the editable lazy-analysis runtime control.
  - Benchmark runs use the real worker pipeline and the bundled `single.pgn` fixture.
  - Benchmark failures show scenario, repetition, and failing step instead of opaque errors.
  - Benchmark writes never pollute normal library analysis history.
  - Benchmark results expose projected full-run runtime and recommended derived safety budget for the tested game.
- Tests/gates:
  - `apps/web/src/domain/analysisBenchmark.test.ts`
  - `apps/web/src/application/runAnalysisBenchmark.test.ts`
  - `apps/web/src/lib/storage/repositories/benchmarkAnalysisRepo.test.ts`
  - `apps/web/src/presentation/analysisBenchmarkView.test.ts`
  - `apps/web/src/presentation/backofficeView.test.ts`

## Risk/Deferment References
- Backoffice now persists lazy-analysis runtime settings locally, but the broader analysis and puzzle constants remain source-backed and read-only.
- Benchmark coverage is intentionally narrow: one bundled short game and a fixed scenario sweep.
- Threads and Hash remain excluded from benchmark comparison until the worker runtime accepts and applies those options.
