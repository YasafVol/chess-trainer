# FITL Nav Layered Build Plan

## Resolved inputs
- Repo root: `/Users/yasafv/obsidian-wix/.obsidian/plugins/chess-trainer`
- Main runtime stack:
  - Obsidian plugin: TypeScript + Obsidian API + esbuild
  - Web app: React 18 + Vite + TanStack Router + IndexedDB
  - Engine (web): Stockfish Web Worker (`stockfish` npm package)
  - Companion service: Node.js + Express + native Stockfish binary
  - Shared package: `packages/chess-core` (TypeScript)
- Current project objective:
  - Keep plugin V1 analysis path stable while executing web-transition v1 (offline import, replay, and in-browser analysis) with explicit boundaries.
- Required quality bar:
  - Red-Green-Refactor per vertical
  - Outer-to-inner dependency discipline
  - Offline-first behavior and explicit network boundaries
  - Docs + tests + code all required for completion
- Deferred scope baseline:
  - Web auth/cloud DB and platform sync out of scope in v1
  - Puzzle/training, API integrations, and advanced analytics deferred

## Canonical layer order
1. Contracts
2. Domain
3. Application
4. Adapters
5. Presentation
6. Composition

Cross-cutting lanes:
- Tests lane
- Documentation lane

## Dependency rule
Only outer layers depend inward:
- `Composition -> Presentation -> Adapters -> Application -> Domain -> Contracts`

No inward layer may import outward implementation.

## Build/refactor sequence (inside-out)
For every vertical:
1. Tests (Red)
2. Contracts
3. Domain
4. Application
5. Adapters
6. Presentation
7. Composition
8. Tests (Green)
9. Refactor
10. Documentation updates

## Vertical execution map

### V1: Import and persist PGN
1. Red tests for parsing/validation contracts (`chess-core` + plugin validator behavior)
2. Contract alignment for game record + metadata shapes
3. Domain normalization/header/hash rules
4. Application flow for import orchestration
5. Adapter writes (`Vault` or IndexedDB)
6. UI/UX submit states and validation display
7. Wiring command/route entrypoints
8. Green + refactor + docs sync

### V2: Replay and navigation
1. Red tests for replay data generation and navigation edge cases
2. Contract updates for replay move/position models
3. Domain replay progression rules
4. Application move-state orchestration
5. Board adapter integration
6. Controls and move list UX
7. Route/plugin processor wiring
8. Green + refactor + docs sync

### V3: Engine analysis and annotations
1. Red tests for analysis-plan policy and parsing contracts
2. Contract updates for run/ply/evaluation structures
3. Domain logic for planning, retries, quality classification
4. Application orchestration for run lifecycle and cancellation
5. Engine/HTTP/storage adapters
6. Analysis status/graph/annotation UI
7. Composition of worker/service/plugin settings
8. Green + refactor + docs sync

### V4: Library and lifecycle management
1. Red tests for repository ordering and retrieval semantics
2. Contract updates for listing/filtering and status summaries
3. Domain rules for sorting and lifecycle transitions
4. Application flows for list/open/refresh
5. Storage adapters and migrations
6. Library and game summary presentation
7. Router/command wiring
8. Green + refactor + docs sync

## Quality gates
- `npm run build` at repo root for plugin integrity
- Web focused TDD checks: `apps/web` `npm run test:tdd`
- Manual plugin QA: `QA_CHECKLIST.md`
- Manual web smoke: `Spec/WEB_APP_SMOKE_CHECKLIST.md`
- V1 companion workflow test: `TESTING.md`

## Governance hooks
When any vertical changes behavior:
- Update layer docs under `docs/architecture/layers/`
- Update vertical doc under `docs/architecture/verticals/`
- Update module mapping under `docs/modules/`
- Update decisions/risks under `docs/decisions/` if tradeoffs changed
