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

---

## Chessboard-Element Drag/Drop Internal State Error

**Date**: 2025-11-09  
**Status**: 🔴 Open (Deferred to Future Version)  
**Severity**: Medium (Non-blocking, graceful error handling in place)

### Description
When making manual moves on the board that diverge from the PGN game, an error occurs:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'items')
    at kk (app.js:1:838046)
    at H._stopDraggedPiece (plugin:chess-trainer:243:12859)
    at H._mouseupWindow (plugin:chess-trainer:243:1409)
```

The error originates from chessboard-element's internal `_stopDraggedPiece()` method, which tries to access `_dragState.items` that is undefined or corrupted.

### Root Cause Analysis
The error occurs due to a race condition between:
1. Chessboard-element's internal drag state management (`_dragState`)
2. Our position update logic (`boardEl.setPosition()`)

**Sequence of events:**
1. User drags and drops a piece (manual move diverging from PGN)
2. Our `drop` handler validates the move and calls `setAction('drop')`
3. Chessboard-element's `_stopDraggedPiece()` begins processing the drop
4. We immediately (or too soon) call `boardEl.setPosition(interactiveGame.fen(), true)`
5. This overwrites chessboard-element's internal state while it's still processing
6. `_stopDraggedPiece()` tries to access `_dragState.items` which is now undefined/corrupted
7. Error thrown

### Location
- File: `main.ts`
- Function: `renderChessBoard()` → `boardEl.addEventListener('drop', ...)`
- Lines: ~802-950

### Solutions Attempted

#### Attempt 1: Try-Catch Wrapper
**Approach**: Wrapped drop handler in try-catch to gracefully handle errors  
**Result**: ❌ Failed - Error occurs in chessboard-element's internal code, not our handler

#### Attempt 2: Deferred Position Update
**Approach**: Used `setTimeout(..., 0)` to defer `setPosition()` call  
**Result**: ❌ Failed - Still too early, race condition persists

#### Attempt 3: Event-Based Waiting
**Approach**: Listen for `snap-end` and `snapback-end` events before updating position  
**Implementation**:
```typescript
boardEl.addEventListener('snap-end', handleDropComplete, { once: true });
boardEl.addEventListener('snapback-end', handleDropComplete, { once: true });
// Update position only after event fires
```
**Result**: ❌ Failed - Events may not fire reliably or timing still causes issues

#### Attempt 4: Prevent Drag-Start for Illegal Moves
**Approach**: Call `event.preventDefault()` in `drag-start` handler for illegal moves  
**Result**: ❌ Failed - Prevents chessboard-element from initializing drag state, causing errors when mouse is released

### Current State
- Error handling in place (try-catch prevents crash)
- Error logged but doesn't break functionality
- Manual moves still work despite the error
- Error only occurs when making moves that diverge from PGN

### Impact
- **User Experience**: Error appears in console but doesn't break functionality
- **Functionality**: Manual moves work correctly despite error
- **Severity**: Medium - Non-blocking but indicates underlying state management issue

### Potential Solutions for Future

#### Option 1: Don't Update Position After Manual Moves
- Let chessboard-element maintain its own position state
- Only sync `interactiveGame` for validation, not board display
- **Pros**: Eliminates race condition entirely
- **Cons**: Board position may diverge from `interactiveGame` state

#### Option 2: Use Chessboard-Element's Built-in Move Method
- Use `boardEl.move()` instead of `setPosition()` for manual moves
- Let chessboard-element handle position updates internally
- **Pros**: Uses library's intended API
- **Cons**: May not support all move types (promotions, en passant)

#### Option 3: Fork/Modify Chessboard-Element
- Modify chessboard-element to expose drag state or add completion callbacks
- **Pros**: Full control over behavior
- **Cons**: Maintenance burden, breaks vendor dependency model

#### Option 4: Alternative Board Library
- Consider switching to a different chess board library
- **Pros**: May have better state management
- **Cons**: Major refactoring, may lose features

#### Option 5: Accept Error and Suppress Console Output
- Add global error handler to suppress specific chessboard-element errors
- **Pros**: Quick fix, no code changes needed
- **Cons**: Masks underlying issue, may hide other problems

### Recommended Approach
**Option 1** (Don't update position after manual moves) seems most promising:
- Manual moves already update `interactiveGame` correctly
- Chessboard-element maintains its own visual state
- Only sync position when navigating PGN moves (not manual moves)
- This eliminates the race condition entirely

### Testing Notes
- Error occurs consistently when:
  - Making manual moves that differ from PGN
  - Dragging pieces to legal but non-PGN positions
- Error does NOT occur when:
  - Navigating PGN moves with buttons
  - Making moves that match PGN sequence
  - Using autoplay

### Related Issues
- May be related to how we handle board state synchronization
- Could affect future features like move annotations on manual moves

---

## Move Pane Focus Management

**Date**: 2025-11-09  
**Status**: 🔴 Open (Deferred to Future Version)  
**Severity**: Low (UX annoyance, doesn't break functionality)

### Description
The move pane (move list) has focus and scrolling issues:
1. The pane may jump/scroll unexpectedly when interacting with the board
2. Focus management may not be optimal for keyboard navigation
3. The current move indicator may not be properly focused for screen readers

### Current Implementation
- A `shouldScrollToMove` flag was added to prevent unwanted scrolling during manual board interactions
- `ensureMoveVisible()` is called conditionally based on this flag
- Scrolling is triggered for navigation (Previous/Next buttons, autoplay, clicking moves)

### Issues
1. **Unexpected Scrolling**: Despite the flag, the pane may still scroll in some edge cases
2. **Focus Management**: No explicit focus management for accessibility (keyboard navigation, screen readers)
3. **Visual Focus Indicator**: Current move may not have proper focus styling for keyboard users
4. **Screen Reader Support**: Move list may not announce current position clearly

### Location
- File: `main.ts`
- Function: `renderChessBoard()` → `render()`
- Related: `ensureMoveVisible()`, `shouldScrollToMove` flag

### Potential Solutions

#### Option 1: Improve Focus Management
- Add explicit `focus()` calls to current move element when navigating
- Ensure proper ARIA attributes (`aria-current="true"`, `role="listitem"`)
- Add keyboard navigation support (arrow keys to navigate moves)

#### Option 2: Refine Scroll Behavior
- Add debouncing to scroll operations
- Use `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` for better UX
- Track scroll position and only scroll if move is actually out of viewport

#### Option 3: Accessibility Improvements
- Add `tabindex` management for keyboard navigation
- Implement proper ARIA live regions for move announcements
- Ensure focus is visible and follows current move

#### Option 4: User Preference
- Add setting to control auto-scroll behavior
- Allow users to disable auto-scrolling entirely
- Provide option for smooth vs instant scrolling

### Recommended Approach
Combine **Option 1** (Focus Management) and **Option 2** (Refine Scroll Behavior):
- Improve focus management for accessibility
- Refine scroll logic to be more intelligent about when to scroll
- Add proper ARIA attributes for screen readers

### Testing Notes
- Issue reported when interacting with board manually
- May be more noticeable on smaller screens or long games
- Keyboard navigation may be affected

---

## Last Move Highlight Styling

**Date**: 2025-11-09  
**Status**: 🔴 Open (Deferred to Future Version)  
**Severity**: Low (Visual polish, doesn't affect functionality)

### Description
The last move highlight on the chess board is visually unsatisfactory. The current implementation uses a light blue color (`rgba(147, 197, 253, 0.4)` for border, `rgba(147, 197, 253, 0.08)` for background) but the styling needs improvement.

### Current Implementation
- Last move squares are highlighted with:
  - Border: `inset 0 0 0 3px rgba(147, 197, 253, 0.4)`
  - Background: `rgba(147, 197, 253, 0.08)`
- Applied to both `from` and `to` squares of the last move
- Combined with check highlight when a square is both in check and part of the last move

### Issues
1. **Color Choice**: Current blue color may not be visually appealing or sufficiently visible
2. **Contrast**: May not have enough contrast against the board squares
3. **Styling Approach**: May need different visual treatment (e.g., different border style, opacity, or color scheme)

### Location
- File: `main.ts`
- Function: `renderChessBoard()` → `applyLastMoveHighlight()`
- Lines: ~767-840

### Potential Solutions

#### Option 1: Color Palette Refinement
- Experiment with different color schemes (e.g., subtle green, amber, or gray)
- Adjust opacity levels for better visibility without being intrusive
- Consider using CSS variables for easy theming

#### Option 2: Alternative Visual Treatment
- Use a different border style (e.g., dashed, dotted, or thicker border)
- Consider using a subtle glow effect instead of solid border
- Use background color only without border

#### Option 3: User Preference
- Add setting to customize highlight color
- Allow users to choose from predefined color schemes
- Provide option to disable last move highlight entirely

#### Option 4: Design Research
- Research common chess UI patterns for last move highlighting
- Consider accessibility (color contrast ratios)
- Test with different board themes/color schemes

### Recommended Approach
Combine **Option 1** (Color Palette Refinement) and **Option 4** (Design Research):
- Research best practices for chess UI last move highlighting
- Test multiple color options and opacity levels
- Ensure good contrast and visual appeal
- Consider making it configurable via settings

### Testing Notes
- Current implementation works functionally but needs visual polish
- Should be tested with different board themes
- Should consider accessibility requirements

---

## Arrow Drawing on Board

**Date**: 2025-11-09  
**Status**: 🔴 Open (Deferred to Future Version)  
**Severity**: Low (Nice-to-have feature, doesn't affect core functionality)

### Description
Users cannot draw arrows or annotations on the chess board to highlight moves, threats, or tactical patterns. This is a common feature in chess analysis tools (Lichess, Chess.com) that helps visualize ideas and variations.

### Current Implementation
- No arrow drawing functionality exists
- Board is rendered using `chessboard-element` web component
- Manual moves can be made but no visual annotations are supported

### Use Cases
1. **Move Visualization**: Draw arrows to show candidate moves or variations
2. **Threat Highlighting**: Mark squares under attack or pieces that are threatened
3. **Tactical Patterns**: Annotate pins, forks, skewers, and other tactical motifs
4. **Study Notes**: Add visual annotations for personal study and review

### Location
- File: `main.ts`
- Component: `renderChessBoard()` → `<chess-board>` element
- Library: `chessboard-element` (may or may not support annotations)

### Potential Solutions

#### Option 1: Chessboard-Element Native Support
- Check if `chessboard-element` has built-in annotation/arrow support
- Use library's native API if available
- **Pros**: Simple, uses existing library
- **Cons**: May not be available or may be limited

#### Option 2: Overlay SVG Layer
- Create an SVG overlay on top of the chess board
- Draw arrows and circles using SVG paths
- Handle click/drag interactions to create annotations
- **Pros**: Full control, flexible styling
- **Cons**: Requires coordinate mapping, more complex implementation

#### Option 3: Canvas Overlay
- Use HTML5 Canvas to draw annotations
- Similar to Option 2 but with Canvas API
- **Pros**: Good performance, flexible drawing
- **Cons**: More complex coordinate calculations

#### Option 4: Alternative Board Library
- Consider switching to a library with built-in annotation support
- Examples: `chessboardjsx`, `react-chessboard`, or custom solution
- **Pros**: May have better annotation features
- **Cons**: Major refactoring, may lose other features

#### Option 5: HTML/CSS Overlay with Absolute Positioning
- Use positioned divs with CSS transforms for arrows
- Simpler than SVG but less flexible
- **Pros**: Easier to implement than SVG
- **Cons**: Less flexible, harder to make interactive

### Recommended Approach
**Option 2** (SVG Overlay) seems most promising:
- Full control over appearance and behavior
- Can integrate with existing `chessboard-element`
- Flexible enough for various annotation types (arrows, circles, highlights)
- Can persist annotations in game data structure

### Technical Considerations
- **Coordinate Mapping**: Need to map chess squares to pixel coordinates
- **Persistence**: Annotations should be saved with game data
- **Interaction**: Click/drag to create, click to delete, hover to preview
- **Styling**: Different colors/styles for different annotation types
- **Shadow DOM**: May need to access `chessboard-element`'s Shadow DOM for proper overlay positioning

### Related Features
- May be related to move annotations/variations display
- Could integrate with Stockfish analysis (highlight best moves)
- Could be part of a study/annotation mode

### Testing Notes
- Should work with board flipping (annotations should flip too)
- Should work with different board sizes/responsive layouts
- Should persist across page reloads if saved in game data

---

