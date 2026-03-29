# FITL Nav Layered Build Plan

## Resolved inputs

- Repo root: repository root (`chess-trainer`)
- Main runtime stack:
  - Web app: React 18 + Vite + TanStack Router + Convex Auth + Convex storage + IndexedDB read cache
  - Engine: Stockfish Web Worker (`stockfish` npm package)
  - Shared package: `packages/chess-core` (TypeScript)
- Current project objective:
  - Ship a stable authenticated web app for import, replay, analysis, puzzle review, and cross-session persistence.
- Required quality bar:
  - Red-Green-Refactor per vertical
  - Outer-to-inner dependency discipline
  - Explicit online-write and offline-read boundaries
  - Docs + tests + code all required for completion
- Deferred scope baseline:
  - Offline write queueing and conflict resolution remain out of scope in v1
  - Advanced analytics and customization deferred

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

## Build/refactor sequence

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
1. Red tests for parsing and persistence contracts
2. Contract alignment for game record and metadata shapes
3. Domain normalization, header extraction, and hashing
4. Application import orchestration
5. Convex persistence adapters plus IndexedDB cache writes
6. Import route UX and validation display
7. Router wiring
8. Green + refactor + docs sync

### V2: Replay and navigation
1. Red tests for replay timeline and navigation behavior
2. Contract updates for replay move and board interactions
3. Domain replay progression rules
4. Application move-state orchestration
5. Board adapter integration
6. Controls, keyboard, and move list UX
7. Route lifecycle wiring
8. Green + refactor + docs sync

### V3: Engine analysis and annotations
1. Red tests for analysis-plan policy and run lifecycle
2. Contract updates for run, ply, and evaluation structures
3. Domain rules for planning, retries, and quality classification
4. Application orchestration for run lifecycle and cancellation
5. Worker and storage adapters
6. Analysis status, eval, and graph UI
7. Engine boot and dependency wiring
8. Green + refactor + docs sync

### V4: Library and game lifecycle
1. Red tests for repository ordering and retrieval semantics
2. Contract updates for listing and summary views
3. Domain rules for sorting and lifecycle transitions
4. Application flows for list, open, refresh, and delete
5. Convex read adapters, cache synchronization, and migrations
6. Library presentation
7. Router and app-shell wiring
8. Green + refactor + docs sync

### V5: Puzzle generation and review
1. Red tests for puzzle derivation and scheduling
2. Contract updates for puzzle, attempt, and schedule shapes
3. Domain rules for classification and spaced repetition
4. Application generation and review flows
5. Puzzle persistence adapters
6. Puzzle list and solve presentation
7. Route wiring
8. Green + refactor + docs sync

## Quality gates

- `npm run typecheck`
- `npm run test`
- `npm run build`
- Manual web smoke: `Spec/WEB_APP_SMOKE_CHECKLIST.md`

## Governance hooks

When any vertical changes behavior:
- Update layer docs under `docs/architecture/layers/`
- Update vertical docs under `docs/architecture/verticals/`
- Update module mapping under `docs/modules/`
- Update decisions docs under `docs/decisions/` if tradeoffs changed
