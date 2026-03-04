# V3: Engine Analysis and Annotations

## Business/User Intent
Provide actionable engine feedback per position so users can identify mistakes, inspect best lines, and revisit analyzed games without rerunning analysis unnecessarily.

## Flow Narrative
1. User triggers analysis (auto after import or manual action).
2. System selects runtime path:
   - Plugin: companion HTTP service
   - Web: in-browser worker engine
3. System builds analysis plan and executes per-ply requests with cancellation/timeout policy.
4. System persists run + per-ply results.
5. UI shows progress and current-ply eval/line details.

## Impacted Layers
- Contracts: analysis request/response and stored run/ply contracts.
- Domain: analysis policy, depth planning, UCI parse logic.
- Application: run lifecycle, retries, cancellation, status transitions.
- Adapters: worker client, HTTP client, Stockfish process, storage repos.
- Presentation: analysis controls, status, inline eval and PV display.
- Composition: startup config and engine/service initialization.

## Execution Order Per Layer
1. Tests (Red): failing plan/policy/parser and run-state transition tests.
2. Contracts: align plugin/web/service analysis contracts.
3. Domain: implement plan rules, retry depth reduction, UCI parsing.
4. Application: implement run orchestration with cancellation and retry semantics.
5. Adapters: implement transport/persistence integration and error mapping.
6. Presentation: add progress and per-ply details with deterministic states.
7. Composition: initialize engine/service paths and dependency wiring.
8. Tests (Green): contract + orchestration + smoke checks pass.
9. Refactor: isolate orchestration from `main.ts`/`game.tsx`.
10. Docs updates: decisions and open issues refreshed.

## Tests and Acceptance Criteria
- Acceptance criteria:
  - Analysis can start, progress, cancel, and complete without UI lockups.
  - Results persist and reload correctly.
  - Timeouts/retries surface explicit status, never silent hangs.
- Tests/gates:
  - Existing `analysisPlan.test.ts` and new run-lifecycle tests.
  - `Spec/WEB_APP_SMOKE_CHECKLIST.md` analysis sections.
  - `TESTING.md` companion API + plugin integration checks.

## Risk/Deferment References
- `docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md`:
  - no hosted analysis in current web v1
  - limited automated tests for service/worker adapters
- `Spec/adr/ADR-002-stockfish-distribution.md`
- `Spec/adr/ADR-004-mobile-performance-guardrails.md`
