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

---

## Hotkey Not Working

**Date**: 2025-01-XX  
**Status**: 🔴 Open  
**Severity**: Medium

### Description
The default hotkey `Mod+Alt+P` (or `Ctrl+Alt+P` / `Cmd+Opt+P`) does not work to open the import modal. The ribbon button works correctly, but the keyboard shortcut does not trigger the command.

### Location
- File: `main.ts`
- Function: `onload()` → `addCommand()`
- Lines: ~52-57

### Current Configuration
```typescript
hotkeys: [
    {
        modifiers: ['Mod', 'Alt'],
        key: 'p'
    }
]
```

### Expected Behavior
- macOS: `Cmd+Opt+P` should open the import modal
- Windows/Linux: `Ctrl+Alt+P` should open the import modal

### Possible Causes
1. Hotkey conflict with another Obsidian command or plugin
2. Obsidian version compatibility issue with hotkey registration
3. Incorrect modifier key names for the Obsidian API
4. Command not properly registered before hotkey assignment

### Workaround
Users can manually assign the hotkey via **Settings → Hotkeys** by searching for "Import PGN" command.

### Notes
- The command appears in the command palette and works when executed manually
- Ribbon button works correctly
- Hotkey registration happens after `ensureChessBoardElement()` completes (async)
- May need to verify Obsidian API version compatibility

