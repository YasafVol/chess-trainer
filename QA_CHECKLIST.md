# QA Checklist: Chess Trainer V0/V0.5

**Date**: 2025-01-XX  
**Tester**: [Name]  
**Platform**: [macOS/Windows/Linux/iOS/Android]  
**Obsidian Version**: [Version]

---

## 1. Import Flow

### 1.1 Ribbon Button
- [ ] Ribbon button (crown icon) appears in left sidebar
- [ ] Clicking ribbon button opens import modal
- [ ] Button tooltip shows "Chess Trainer"

### 1.2 Command Palette
- [ ] Command "Chess Trainer: Import PGN" appears in palette
- [ ] Command executes and opens import modal

### 1.3 Hotkey (Known Issue)
- [ ] Hotkey `Mod+Alt+P` works (if not, document as known issue)
- [ ] If hotkey doesn't work, verify workaround: Settings → Hotkeys → assign manually

### 1.4 Import Modal
- [ ] Modal opens with title "Import PGN"
- [ ] Description text is visible
- [ ] "Load Example PGN" button is visible and functional
- [ ] Textarea is visible and focusable
- [ ] Placeholder text appears in textarea
- [ ] "Import" and "Cancel" buttons are visible

---

## 2. PGN Validation

### 2.1 Empty Input
- [ ] Empty textarea shows validation status (📝 icon)
- [ ] Submit button is disabled when empty
- [ ] Attempting to submit empty PGN shows error

### 2.2 Valid PGN
- [ ] Valid PGN shows ✅ validation status
- [ ] Submit button is enabled
- [ ] Success notice appears after import
- [ ] Note is created in `Chess/games/` folder
- [ ] Filename format is correct

### 2.3 Invalid PGN
- [ ] Invalid PGN shows ❌ validation status
- [ ] Error message is displayed
- [ ] Line numbers shown if available (format: "Line X: error message")
- [ ] Submit button is disabled
- [ ] Modal stays open on validation error
- [ ] Error notice appears if attempting to submit

### 2.4 Example PGN Helper
- [ ] "Load Example PGN" button loads example game
- [ ] Example PGN validates successfully
- [ ] Textarea shows example content
- [ ] Validation runs automatically after loading example

### 2.5 Sample PGNs
Test each sample file from `Spec/samples/`:

- [ ] `chessSimple.pgn` - Imports successfully
- [ ] `chesscom-game.pgn` - Imports successfully
- [ ] `lichess-game.pgn` - Imports successfully (no Elo)
- [ ] `complex-game.pgn` - Imports successfully (with NAGs and comments)
- [ ] `malformed.pgn` - Shows appropriate error (invalid move)

---

## 3. Note Creation

### 3.1 File Creation
- [ ] Note is created in correct location: `Chess/games/`
- [ ] Folder is created if it doesn't exist
- [ ] Filename format matches: `YYYY-MM-DD White(elo)-vs-Black(elo) result.md`
- [ ] Username truncation works (names >5 chars show ellipsis)
- [ ] Result normalization works (`1/2-1/2` → `draw`, `1-0` → `white`, `0-1` → `black`)

### 3.2 Frontmatter
- [ ] All required fields present:
  - [ ] `source: manual`
  - [ ] `created: YYYY-MM-DD` (date only)
  - [ ] `date: YYYY.MM.DD` (game date)
  - [ ] `white: "PlayerName"`
  - [ ] `white_elo: number | null`
  - [ ] `black: "PlayerName"`
  - [ ] `black_elo: number | null`
  - [ ] `result: "1-0" | "0-1" | "1/2-1/2" | "*"`
  - [ ] `eco: "ECO_CODE" | ""`
  - [ ] `opening: "Opening Name" | ""`
  - [ ] `hash: "sha1hash"`
  - [ ] `tags: ['chess', 'game_analysis']`

### 3.3 Note Content
- [ ] PGN is wrapped in ````chess-pgn` code block
- [ ] Original PGN text is preserved exactly
- [ ] Frontmatter is valid YAML

### 3.4 Duplicate Handling
- [ ] Importing same PGN twice updates existing note
- [ ] Update notice appears: "📝 Updated chess note: ..."

---

## 4. Board Renderer

### 4.1 Display
- [ ] Board renders when note is opened
- [ ] Board size is 720px (or responsive on mobile)
- [ ] Board displays starting position correctly
- [ ] Pieces are visible and correctly positioned

### 4.2 Controls
- [ ] Previous button (‹) works
- [ ] Next button (›) works
- [ ] Reset button (↺) returns to start
- [ ] Play/Pause button (▶/⏸) toggles autoplay
- [ ] Flip button (⇅) flips board orientation

### 4.3 Move Navigation
- [ ] Clicking prev/next moves through game
- [ ] Current move is highlighted in move list (brackets)
- [ ] Move list scrolls appropriately
- [ ] Board position updates correctly

### 4.4 Autoplay
- [ ] Autoplay starts when Play button clicked
- [ ] Moves advance automatically (~500ms per ply)
- [ ] Autoplay pauses when Pause clicked
- [ ] Autoplay stops at end of game
- [ ] Warning shown for games >500 moves
- [ ] Autoplay disabled for games >500 moves

### 4.5 Board Flip (Known Issue - Fixed)
- [ ] Flip button changes board orientation
- [ ] Board stays in flipped orientation during autoplay (not toggling)
- [ ] Manual navigation works correctly when flipped
- [ ] Board returns to white orientation when flipped again

### 4.6 Accessibility
- [ ] ARIA labels present on all buttons
- [ ] Screen reader announces current move
- [ ] Controls have proper roles and labels
- [ ] Board has aria-label

### 4.7 Responsive Design
- [ ] Board scales on mobile devices (< 768px width)
- [ ] Controls are touch-friendly (minimum 44px targets)
- [ ] Move list scrolls on narrow screens
- [ ] Layout doesn't break on small screens

---

## 5. Error Handling

### 5.1 Validation Errors
- [ ] Invalid PGN shows error notice
- [ ] Error message is clear and actionable
- [ ] Modal stays open on validation error

### 5.2 File Errors
- [ ] File creation errors show error notice
- [ ] Error message includes cause
- [ ] User can retry after error

### 5.3 Edge Cases
- [ ] PGN with missing headers shows warnings
- [ ] PGN without Elo ratings works
- [ ] PGN with special characters in names works
- [ ] Very long PGN (>500 moves) shows warning
- [ ] Empty or whitespace-only PGN shows error

---

## 6. Cross-Platform Testing

### 6.1 Desktop
- [ ] macOS: All features work
- [ ] Windows: All features work
- [ ] Linux: All features work (if tested)

### 6.2 Mobile
- [ ] iOS: Plugin loads and basic features work
- [ ] Android: Plugin loads and basic features work
- [ ] Touch targets are adequate size
- [ ] Board renders correctly on mobile

---

## 7. Performance

### 7.1 Import Performance
- [ ] Note creation completes in <1 second
- [ ] No noticeable lag during import

### 7.2 Renderer Performance
- [ ] Board renders quickly on note open
- [ ] Move navigation is smooth
- [ ] Autoplay runs smoothly without lag
- [ ] Memory usage acceptable (<50 MB per board)

### 7.3 Large Games
- [ ] Games with 100-300 moves work smoothly
- [ ] Games >500 moves show warning and disable autoplay
- [ ] Manual navigation works for all game sizes

---

## 8. User Feedback

### 8.1 Notices
- [ ] Success notice appears: "✅ Created chess note: ..."
- [ ] Update notice appears: "📝 Updated chess note: ..."
- [ ] Error notices appear with clear messages
- [ ] Notices are visible and readable

### 8.2 Visual Feedback
- [ ] Validation status is clear (✅/❌/📝)
- [ ] Button states are obvious (enabled/disabled)
- [ ] Current move highlighting is clear
- [ ] Loading states are visible (if any)

---

## 9. Console & Debugging

### 9.1 Console Logging
- [ ] No unexpected errors in console
- [ ] Log messages are helpful for debugging
- [ ] Error messages include context

### 9.2 Network Requests
- [ ] No network requests in production build
- [ ] All dependencies are bundled locally

---

## 10. Known Issues Verification

### 10.1 Hotkey Issue
- [ ] Status: 🔴 Open
- [ ] Workaround: Manual assignment works
- [ ] Documented in BUGS.md

### 10.2 Board Flip Issue
- [ ] Status: ✅ Fixed
- [ ] Verified: Board stays in flipped orientation during autoplay

---

## Test Results Summary

**Total Tests**: [X]  
**Passed**: [X]  
**Failed**: [X]  
**Skipped**: [X]  

**Critical Issues Found**: [List any]

**Recommendations**: [Any suggestions]

---

**Notes**: [Any additional observations]

