# Known Bugs

## Board Flip Autoplay Issue

**Date**: 2025-01-XX  
**Status**: Fixed  
**Severity**: Medium

### Description
When the chess board is manually flipped to show black's perspective (using the flip button) and then autoplay is started, the board orientation flips on every move instead of maintaining the black orientation. This issue does not occur when the board is in its default white orientation.

### Root Cause
The board orientation logic was incorrectly toggling between 'black' and 'white' based on the current ply number (`currentPly % 2`) when flipped, instead of maintaining a fixed 'black' orientation.

### Location
- File: `main.ts`
- Function: `renderChessBoard()` → `render()`
- Lines: ~260-265 (before fix)

### Fix
Changed the orientation logic to maintain a fixed 'black' orientation when flipped, rather than toggling based on move number:

```typescript
// Before (buggy):
if (flipped) {
    boardEl.setAttribute('orientation', (currentPly % 2 === 0) ? 'black' : 'white');
}

// After (fixed):
if (flipped) {
    boardEl.setAttribute('orientation', 'black');
}
```

### Verification
- [x] Board stays in black orientation when flipped and autoplay is used
- [x] Board stays in white orientation (default) when not flipped and autoplay is used
- [x] Manual navigation (prev/next) works correctly with both orientations

