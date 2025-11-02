# V1 Worker Blocker: Stockfish Integration

## Issue Summary

**Status**: 🔴 BLOCKED  
**Date Identified**: 2025-11-01  
**Impact**: V1 Milestone 1 (Stockfish WASM Integration) cannot proceed as planned

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

## Alternative Approaches

### Option 1: Main Thread Execution (Not Recommended)
- Run Stockfish in main thread (blocking)
- Would freeze UI during analysis
- Poor user experience
- **Verdict**: Not viable for production

### Option 2: Simpler JavaScript Engine
- Use a pure JavaScript chess engine (no WASM, no Workers)
- Examples: `chess.js` (already used, but no engine), `sunfish.js`, `chess-engine-js`
- Much weaker than Stockfish (~1500-1800 ELO vs 3000+)
- **Verdict**: Could work but significantly weaker analysis

### Option 3: Cloud-Based Analysis API
- Use external service (Chess.com API, Lichess API, Stockfish Cloud)
- Requires internet connection
- API rate limits
- Privacy concerns
- **Verdict**: Viable but goes against offline-first philosophy

### Option 4: Defer V1 Feature
- Move Stockfish integration to future version
- Focus on V1 features that don't require Workers
- Wait for Obsidian to support Workers
- **Verdict**: Most pragmatic approach

### Option 5: Native Module (Future)
- Create Node.js native addon for Stockfish
- Would require native compilation
- Complex build process
- **Verdict**: Overkill for this plugin

## Recommended Path Forward

**SOLUTION ACCEPTED**: Main-thread analysis with annotation storage
- Run Stockfish in main thread during import (blocking is acceptable)
- Save analysis results to annotation file
- Read from annotation file when displaying (fast, non-blocking)
- See `Spec/V1_MAIN_THREAD_SOLUTION.md` for implementation details

**Implementation Status**: ✅ SOLUTION IDENTIFIED

## Related Files

- `src/services/engine/StockfishEngine.ts` - Current implementation (blocked)
- `src/services/engine/testStockfish.ts` - Test file (fails)
- `Spec/V1_IMPLEMENTATION_PLAN.md` - Original plan (needs update)
- `STOCKFISH_TEST.md` - Test documentation

## Next Steps

1. Update `Spec/V1_IMPLEMENTATION_PLAN.md` to reflect this blocker
2. Consider alternative V1 features that don't require Workers
3. Document Worker limitation in `README.md`
4. Remove or defer Stockfish-related code until solution found

