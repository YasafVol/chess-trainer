# V3: Engine Analysis and Annotations

## Business/User Intent

Provide actionable engine feedback per position so users can identify mistakes, inspect best lines, and revisit analyzed games without rerunning analysis unnecessarily.

## Impacted Layers

- Contracts: analysis request, response, and persisted run/ply contracts
- Domain: analysis policy, plan rules, run lifecycle logic, and benchmark scenario/summary rules
- Application: run orchestration, cancellation, retries, progress updates, and repeated benchmark execution
- Adapters: worker client, worker runtime, analysis repositories, and isolated benchmark analysis storage
- Presentation: analysis controls, ply-based progress, per-ply evaluation display, eval bar, eval graph, SAN/NAG move suffixes, read-only admin visibility into current engine depth/limit settings, and the benchmark reporting page
- Composition: engine flavor selection, startup wiring, and the benchmark route under `/backoffice/analysis-benchmark`

## Benchmark Notes

- The benchmark page loads the bundled `assets/icons/single.pgn` fixture through Vite raw import and parses it through the same replay pipeline used by imported games.
- Benchmark runs call the real `runGameAnalysis` path and therefore include worker init, per-ply searches, played-move follow-up searches, retry handling, and IndexedDB write cost.
- Benchmark writes are isolated from the main local library/history by using a separate IndexedDB database name for benchmark analysis stores.
- Benchmarkable knobs in v1:
  - engine flavor
  - depth
  - movetime
  - MultiPV
  - base foreground budget
  - foreground budget per ply
- Explicitly excluded from v1 benchmark sweeps:
  - `Threads`, because the worker currently forces `Threads=1`
  - `Hash`, because the worker does not set the Stockfish `Hash` option yet

## Tests and Acceptance Criteria

- Analysis can start, progress, cancel, and complete without UI lockups
- Results persist and reload correctly
- Timeouts and retries surface explicit status
- Benchmark route can execute repeated scenario runs and report aggregate timing summaries without polluting normal analysis history
- Existing gates:
  - `apps/web/src/domain/analysisPlan.test.ts`
  - `apps/web/src/domain/analysisRunLifecycle.test.ts`
  - `apps/web/src/application/runGameAnalysis.test.ts`
  - `apps/web/src/lib/storage/repositories/analysisRepo.test.ts`
  - `apps/web/src/domain/analysisBenchmark.test.ts`
  - `apps/web/src/application/runAnalysisBenchmark.test.ts`
  - `apps/web/src/lib/storage/repositories/benchmarkAnalysisRepo.test.ts`
