# Chess Trainer Web App Plan

**Date**: 2026-02-25  
**Status**: Active  
**Scope**: Web app with browser-native analysis. No auth, no cloud DB for v1.

## 1. Product Direction

Chess Trainer ships as a standalone web app deployed on Vercel with these locked choices:

1. Frontend stack: React + Vite + TanStack Router (SPA).
2. Analysis runtime: Stockfish in browser Web Worker (no analysis backend in v1).
3. Persistence: Browser local storage (IndexedDB) with explicit schema versioning.
4. Mobile floor: depth 16 default, with long-game guardrails.

Linked decisions:
- `Spec/adr/ADR-001-board-library.md`
- `Spec/adr/ADR-002-stockfish-distribution.md`
- `Spec/adr/ADR-003-browser-storage-schema.md`
- `Spec/adr/ADR-004-mobile-performance-guardrails.md`
- Execution backlog: `Spec/WEB_APP_BACKLOG.md`

## 2. Current Product Feature Map

### 2.1 Implemented Today

1. Multi-game PGN import with split-and-preview flow.
2. Local game persistence in IndexedDB.
3. Interactive board viewer with replay controls and manual moves.
4. Browser-side Stockfish analysis with persisted per-ply results.
5. Puzzle generation and review from analyzed mistakes and blunders.

### 2.2 Known Gaps / Risk Areas

1. Route-local orchestration still needs extraction into application services.
2. Route-level UI test coverage is still missing.
3. Deployment smoke automation is still missing.

## 3. Web v1 Scope (Locked)

### In scope

1. PGN import + validation.
2. Game library (local browser data only).
3. Interactive board + move list + playback controls.
4. Browser Stockfish analysis (worker), with per-ply annotations and eval graph.
5. Export/import of local data snapshots.
6. Vercel deployment with production build profile.

### Out of scope

1. Auth.
2. Convex or any remote DB.
3. Chess.com/Lichess sync.
4. Cloud analysis service.

## 4. Planned Feature Roadmap (Web)

### Phase A: Foundation

1. App shell and routes (`/import`, `/library`, `/game/:id`).
2. Core domain package for PGN normalization/validation/hash and metadata extraction.
3. Local game CRUD in IndexedDB.

### Phase B: Viewer

1. Board integration with stable drag/drop behavior.
2. Move list rendering and keyboard navigation.
3. Playback controls + autoplay.

### Phase C: Browser Analysis

1. Worker-based UCI adapter.
2. Engine run controls (depth/time/multiPV baseline).
3. Per-ply analysis persistence and eval graph.
4. Cancellation and progressive status updates.

### Phase D: Hardening + Release

1. Mobile and performance tuning to accepted guardrails.
2. Accessibility pass.
3. Export/import backup flow.
4. Vercel deploy and release checklist.

## 5. Execution Checklist

## 5.1 Sprint 1 (Foundation)

1. Create app workspace with React + Vite + TanStack Router.
2. Implement `GameRecord` storage and migration runner for schema versioning.
3. Consolidate validator and PGN parsing utilities into the shared web-facing domain module.
4. Implement import screen with validation status and save action.

**Exit criteria**: user can import PGN and open a saved game from local storage.

## 5.2 Sprint 2 (Viewer)

1. Integrate board library from ADR-001.
2. Implement move navigation and move list state sync.
3. Add autoplay and board orientation controls.
4. Add promotion chooser and legal-move enforcement.

**Exit criteria**: board viewer is stable for manual play and PGN navigation on desktop/mobile.

## 5.3 Sprint 3 (Analysis)

1. Add worker bootstrap and UCI command channel from ADR-002.
2. Implement depth-16 default analysis profile from ADR-004.
3. Store and render per-ply evaluation data using ADR-003 schema.
4. Implement long-game guardrails and “refine analysis” UX.

**Exit criteria**: analysis runs in-browser without freezing UI; results persist locally.

## 5.4 Sprint 4 (Release)

1. Add import/export local backup format.
2. Complete keyboard and accessibility pass.
3. Add error boundaries and recoverable engine failure paths.
4. Configure Vercel build and run production smoke checklist.

**Exit criteria**: production-ready v1 deployed on Vercel.

## 6. Success Metrics (v1)

1. Import-to-playback success > 99% on valid PGN fixtures.
2. No UI freeze during analysis on supported mobile devices.
3. Median analysis startup < 2s after user action.
4. Full offline functionality after first load.
5. Zero dependency on remote services for core flows.
