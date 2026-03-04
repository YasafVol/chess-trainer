# V1: Import and Persist PGN

## Business/User Intent
Allow a user to paste a PGN once and reliably persist a reusable game artifact (plugin note or web record) with metadata, deterministic identity, and immediate feedback.

## Flow Narrative
1. User opens import surface (plugin modal or web import route).
2. User pastes PGN and receives validation status.
3. System normalizes PGN, extracts headers, computes hash, and derives replay metadata.
4. System persists output:
   - Plugin: markdown note under `Chess/games/`
   - Web: `GameRecord` in IndexedDB
5. System confirms success and enables follow-up flows (open game/replay/analysis).

## Impacted Layers
- Contracts: PGN/header/hash and record contracts.
- Domain: normalization, parsing, deterministic naming/hash.
- Application: import orchestration and error handling.
- Adapters: vault/IndexedDB write paths.
- Presentation: modal/form validation and user feedback.
- Composition: command/route wiring.

## Execution Order Per Layer
1. Tests (Red): failing parser/validator and persistence-contract tests.
2. Contracts: stabilize `PgnHeaders`, validation result, and `GameRecord` shape.
3. Domain: implement/adjust normalization and hash rules.
4. Application: orchestrate import transaction and branching outcomes.
5. Adapters: implement `upsert`/`saveGame` behaviors with idempotence.
6. Presentation: wire import UI status and submit behavior.
7. Composition: register command/ribbon/route entrypoint.
8. Tests (Green): pass unit + integration + smoke checks.
9. Refactor: split orchestration from UI where mixed.
10. Docs updates: layer, module, decision/risk references.

## Tests and Acceptance Criteria
- Acceptance criteria:
  - Valid PGN imports successfully and is persisted.
  - Invalid PGN blocks persistence with clear error feedback.
  - Repeat import is idempotent (update/replace semantics documented).
- Tests/gates:
  - Web TDD checks in `apps/web/src/domain/analysisPlan.test.ts` plus new import tests.
  - Plugin regression via `QA_CHECKLIST.md` import section.
  - `npm run build` passes at repo root.

## Risk/Deferment References
- `docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md`:
  - main.ts monolith compromise
  - import validation duplication across plugin/shared package
- `Spec/WEB_APP_BACKLOG.md` tickets: `WEB-101`, `WEB-003`, `WEB-005`.
