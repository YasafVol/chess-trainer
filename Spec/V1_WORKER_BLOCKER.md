# V1 Worker Blocker: Stockfish Integration (Archived)

> **Update (V1 Companion Service Plan)**: The embedded WASM approach documented here is no longer pursued. See `Spec/V1_IMPLEMENTATION_PLAN.md` for the active strategy that uses a local Stockfish companion service (with an optional hosted API). This document is retained for historical context.

## Issue Summary

**Status**: 🔴 BLOCKED (historical)  
**Date Identified**: 2025-11-01  
**Impact**: Original Milestone 1 (Stockfish WASM Integration) could not proceed as planned

## Problem

Obsidian's Electron environment does not support Web Workers. When attempting to create a Worker:

```
Error: Failed to construct 'Worker': The V8 platform used by this instance of Node does not support creating Workers
```

This blocks Stockfish integration because:
- `stockfish.js` requires Web Workers (as documented in its README)
- `stockfish.wasm` also requires Web Workers
- All Stockfish WASM ports are designed to run in Workers for non-blocking execution

## Attempted Solutions

1. ✅ Switched from `stockfish.wasm` to `stockfish.js` (single-threaded version)
2. ✅ Tried blob URL approach (fetch + create blob + Worker from blob)
3. ✅ Tried relative path with `./` prefix (required by Electron)
4. ❌ All approaches fail with the same Worker creation error

## Evidence

- Error occurs in both approaches:
  - Direct Worker creation: `new Worker('./stockfish.wasm.js')` → Worker creation blocked
  - Blob URL approach: `fetch()` → `app://obsidian.md/` protocol doesn't support fetch
  - Both fail with: "The V8 platform used by this instance of Node does not support creating Workers"

## Alternative Approaches (Historical)

### Option 1: Main Thread Execution
- Run Stockfish in main thread (blocking)
- Save analysis to annotation file
- Read annotations during playback
- **Status**: Archived – superseded by companion service

### Option 2: Companion Service (Adopted)
- Run Stockfish outside Obsidian
- Communicate via HTTP / JSON API
- Avoid Worker limitations entirely
- **Status**: ✅ Active – see `Spec/V1_IMPLEMENTATION_PLAN.md`

### Option 3: Cloud Analysis
- Use remote engine (e.g., Stockfish API)
- Requires network access
- Potential cost / latency
- Considered as future enhancement

## Current Resolution

We are proceeding with the companion-service architecture. This blocker document remains for historical knowledge.
