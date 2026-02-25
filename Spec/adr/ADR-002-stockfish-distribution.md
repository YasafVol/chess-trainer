# ADR-002: Browser Stockfish Distribution

**Status**: Accepted  
**Date**: 2026-02-25

## Context

The web app must run analysis in-browser without a backend service for v1. The engine must run in a Web Worker and support a stable UCI flow across desktop and mobile.

## Decision

Use **`nmrugg/stockfish.js` (Stockfish 18 family)** with a worker-based adapter.

Default runtime profile:

1. Mobile default: `stockfish-18-lite-single`.
2. Desktop default: `stockfish-18-single`.
3. Optional advanced mode: `stockfish-18` (multi-threaded) only when cross-origin isolation requirements are satisfied.

## Why

1. Mature browser-targeted packaging with multiple performance profiles.
2. No local companion service needed for v1.
3. Supports a clean UCI command channel in worker context.

## Trade-offs

### Benefits

1. Fully local/offline analysis.
2. Keeps backend complexity out of v1.
3. Straightforward deployment on Vercel static hosting path.

### Costs

1. Engine assets are large and must be lazy-loaded.
2. Multi-thread mode depends on browser isolation headers.
3. Analysis quality/speed trade-offs must be tuned by device class.

## Guardrails

1. Always lazy-load engine at first analysis action.
2. Worker must support cancellation and queue replacement.
3. Persist engine metadata in analysis runs:
   - engine name
   - engine version
   - binary flavor
   - analysis options
4. Pin engine artifact versions and checksums in build metadata.

## Revisit Trigger

Revisit when:

1. Browser compatibility for selected binary flavor regresses.
2. Bundle size exceeds agreed performance budget.
3. A better-maintained stockfish browser distribution becomes clearly superior.
