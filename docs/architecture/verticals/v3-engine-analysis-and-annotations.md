# V3: Engine Analysis and Annotations

## Business/User Intent

Provide actionable engine feedback per position so users can identify mistakes, inspect best lines, and revisit analyzed games without rerunning analysis unnecessarily.

## Impacted Layers

- Contracts: analysis request, response, and persisted run/ply contracts
- Domain: analysis policy, plan rules, and run lifecycle logic
- Application: run orchestration, cancellation, retries, and progress updates
- Adapters: worker client, worker runtime, and analysis repositories
- Presentation: analysis controls, progress, and per-ply evaluation display
- Composition: engine flavor selection and startup wiring

## Tests and Acceptance Criteria

- Analysis can start, progress, cancel, and complete without UI lockups
- Results persist and reload correctly
- Timeouts and retries surface explicit status
- Existing gates:
  - `apps/web/src/domain/analysisPlan.test.ts`
  - `apps/web/src/domain/analysisRunLifecycle.test.ts`
  - `apps/web/src/application/runGameAnalysis.test.ts`
  - `apps/web/src/lib/storage/repositories/analysisRepo.test.ts`
