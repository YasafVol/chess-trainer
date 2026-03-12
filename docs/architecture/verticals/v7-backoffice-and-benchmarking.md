# V7: Backoffice and Benchmarking

## Business/User Intent
Give maintainers a read-only operational surface for inspecting shipped analysis and puzzle constants, and a repeatable benchmark harness for comparing real browser-worker analysis cost on the bundled PGN fixture.

## Flow Narrative
1. Maintainer opens the backoffice route.
2. System renders the currently shipped source-backed constants grouped into readable sections.
3. Maintainer opens the analysis benchmark route from backoffice.
4. System loads the bundled `single.pgn` fixture, builds benchmark scenarios, and runs repeated analysis through the real worker path.
5. System reports scenario-level timing summaries, projected full-run runtime, safety-stop counts, and recommended derived safety budgets.

## Impacted Layers
- Contracts: benchmark scenario, repetition, summary, progress, and read-only config-section contracts.
- Domain: movetime-first analysis policy, benchmark scenario definitions, summary aggregation, and blocked-knob rules.
- Application: repeated benchmark execution, step-level error reporting, failure normalization, and progress event emission.
- Adapters: isolated benchmark IndexedDB database, benchmark repositories, and engine-worker client wiring.
- Presentation: `/backoffice` config sections, `/backoffice/analysis-benchmark` scenario cards, status/failure surfaces, and benchmark results table.
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
  - Backoffice shows the shipped analysis and puzzle constants without allowing mutation.
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
- Backoffice config is still source-backed and read-only; persisted admin config and validation are deferred.
- Benchmark coverage is intentionally narrow: one bundled short game and a fixed scenario sweep.
- Threads and Hash remain excluded from benchmark comparison until the worker runtime accepts and applies those options.
