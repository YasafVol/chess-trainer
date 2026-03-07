# Web App Backlog (Ticket-Level)

**Date**: 2026-02-25  
**Scope**: Web v1 only (no auth, no cloud DB)  
**References**:
- `Spec/WEB_APP_TRANSITION_PLAN.md`
- `Spec/adr/ADR-001-board-library.md`
- `Spec/adr/ADR-002-stockfish-distribution.md`
- `Spec/adr/ADR-003-browser-storage-schema.md`
- `Spec/adr/ADR-004-mobile-performance-guardrails.md`

## Epic E1: Platform Foundation (Sprint 1)

### WEB-001: Bootstrap web workspace
- Estimate: 1 day
- Description: Create `apps/web` and `packages/chess-core` scaffolds with build/run scripts.
- Acceptance criteria:
  - `apps/web` starts with `npm run dev`.
  - `packages/chess-core` is importable by the web app.
  - Root scripts resolve cleanly to the web app runtime.

### WEB-002: Routing shell with TanStack Router
- Estimate: 0.5 day
- Description: Create routes for import, library, and game view.
- Acceptance criteria:
  - Routes exist: `/`, `/library`, `/game/:gameId`.
  - Basic navigation works without full page reload.

### WEB-003: Shared chess-core domain package
- Estimate: 1 day
- Description: Move baseline PGN normalization/header parsing/hash utilities to shared package.
- Acceptance criteria:
  - Shared module exports `normalizePgnInput`, `extractHeaders`, `sha1`.
  - Utilities have unit tests with sample PGNs.

### WEB-004: IndexedDB schema boot + migration runner
- Estimate: 1 day
- Description: Implement DB open/init, schema version metadata, and migration hooks.
- Acceptance criteria:
  - Stores created: `games`, `analysisRuns`, `analysisByPly`, `appMeta`.
  - Schema version written/read successfully.
  - Migration runner executes idempotently.

### WEB-005: Game repository (local persistence)
- Estimate: 1 day
- Description: CRUD wrapper for game records in IndexedDB.
- Acceptance criteria:
  - Create/read/update/delete game records.
  - List games sorted by `updatedAt`.
  - Record shape matches ADR-003.

## Epic E2: Import + Viewer (Sprint 2)

### WEB-101: PGN import screen
- Estimate: 1 day
- Description: Build import UI with validation status and save action.
- Acceptance criteria:
  - Invalid PGN blocks save.
  - Valid PGN saves with metadata and hash.
  - User can navigate directly to saved game.

### WEB-102: Board adapter abstraction
- Estimate: 1 day
- Description: Introduce board adapter interface and concrete `chessboard-element` adapter.
- Acceptance criteria:
  - Adapter supports set position, orientation, legal move callbacks.
  - UI uses adapter, not library-specific calls in page component.

### WEB-103: Game viewer controls
- Estimate: 1.5 days
- Description: Prev/next/reset/play/flip controls with move list sync.
- Acceptance criteria:
  - Controls update board and highlighted move consistently.
  - Autoplay works and stops at game end.
  - Keyboard shortcuts for navigation are supported.

### WEB-104: Manual move + promotion flow
- Estimate: 1 day
- Description: Allow legal manual moves with promotion selection and state sync.
- Acceptance criteria:
  - Illegal moves snap back.
  - Promotion flow is deterministic and tested.
  - No duplicate event listeners after route remount.

### WEB-105: Accessibility pass for viewer
- Estimate: 1 day
- Description: Add ARIA labels, live-region move announcements, and focus behavior.
- Acceptance criteria:
  - Controls have accessible names.
  - Current move announcement updates per navigation.
  - Focus order is predictable on desktop/mobile.

## Epic E3: Browser Analysis (Sprint 3)

### WEB-201: Worker bootstrap and command protocol
- Estimate: 1 day
- Description: Implement worker host/client protocol for engine lifecycle.
- Acceptance criteria:
  - Commands: init, analyze position, cancel, terminate.
  - Responses include success/error and correlation ID.

### WEB-202: Stockfish binary integration
- Estimate: 1.5 days
- Description: Wire `nmrugg/stockfish.js` flavors per ADR-002.
- Acceptance criteria:
  - Mobile defaults to `stockfish-18-lite-single`.
  - Desktop defaults to `stockfish-18-single`.
  - Engine flavor/version persisted in analysis run metadata.

### WEB-203: Per-ply analysis pipeline
- Estimate: 2 days
- Description: Analyze game move-by-move and persist partial results incrementally.
- Acceptance criteria:
  - `analysisRuns` and `analysisByPly` populated during execution.
  - Cancelling run updates status to `cancelled`.
  - Resume/re-run starts a new run cleanly.

### WEB-204: Eval graph + annotations UI
- Estimate: 1.5 days
- Description: Render per-ply evaluations and move quality markers in game view.
- Acceptance criteria:
  - Graph highlights current ply.
  - Annotation badges visible in move list.
  - Missing analysis state handled cleanly.

### WEB-205: Long-game guardrails implementation
- Estimate: 1 day
- Description: Enforce ADR-004 thresholds and fallback behaviors.
- Acceptance criteria:
  - `<=200` plies: full depth-16 pass.
  - `201-300` plies: reduced first pass + refine option.
  - `>300` plies: key-position-first mode.
  - Runtime cap and background-tab pause implemented.

## Epic E4: Release Hardening (Sprint 4)

### WEB-301: Error boundaries + recovery UX
- Estimate: 1 day
- Description: Add global and route-level error boundaries with retry paths.
- Acceptance criteria:
  - Worker crashes do not crash app shell.
  - User can retry import/view/analyze actions.

### WEB-302: Backup import/export
- Estimate: 1 day
- Description: Export all local records to JSON and restore from JSON.
- Acceptance criteria:
  - Export contains schema version and all records.
  - Import validates payload and runs migrations as needed.

### WEB-303: Mobile performance validation
- Estimate: 1 day
- Description: Validate target devices and tune defaults.
- Acceptance criteria:
  - No UI freeze in test matrix during analysis.
  - Thermal throttling scenarios handled (cancel/pause exposed).

### WEB-304: Vercel deployment setup
- Estimate: 0.5 day
- Description: Add deploy config and release checklist.
- Acceptance criteria:
  - Preview deploy works.
  - Production build passes.
  - Static assets for worker/engine load correctly.

### WEB-305: E2E smoke tests
- Estimate: 1 day
- Description: Add critical-path test suite (import -> play -> analyze).
- Acceptance criteria:
  - CI smoke test covers import, navigation, analysis start, and cancel.
  - Failures include actionable logs.

## Cross-cutting technical tasks

### WEB-X01: Telemetry-free logging strategy
- Estimate: 0.5 day
- Acceptance criteria:
  - Debug logs local only.
  - No remote telemetry in v1.

### WEB-X02: Fixture suite for PGN edge cases
- Estimate: 1 day
- Acceptance criteria:
  - Includes comments, NAGs, variations, malformed inputs, long games.

### WEB-X03: Architecture docs sync
- Estimate: 0.5 day per sprint
- Acceptance criteria:
  - ADR status and backlog progress remain current.

## Milestone exit gates

1. Sprint 1 gate: import + storage base complete.
2. Sprint 2 gate: stable viewer and mobile-safe interactions.
3. Sprint 3 gate: in-browser analysis with guardrails and persistence.
4. Sprint 4 gate: deployable release with backup and smoke tests.
