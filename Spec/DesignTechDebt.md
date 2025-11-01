# Design, Technical, and Bug Debt

This document tracks design improvements, technical debt, and known bugs that are deferred to future versions or phases.

**Related Documents**:
- `Spec/ROADMAP.md` - Complete version roadmap
- `Spec/V0_IMPLEMENTATION_PLAN.md` - Foundation implementation plan
- `Spec/V0_5_IMPLEMENTATION_PLAN.md` - Polish & QA follow-up
- `BUGS.md` - Known bugs documentation

---

## Version 1.0 (Post-V0 Release)

### Game Analysis Features
- **Stockfish WASM Integration**: Embedded chess engine analysis
- **Eval Graph**: Visual evaluation bar showing position strength over time
- **Move Annotations**: Automatic annotations for best moves, mistakes, blunders, critical positions, tactical opportunities
- **Analysis Note**: Second note created alongside game note with detailed move-by-move analysis, position evaluations, suggested improvements, key moments highlighted

### Technical Requirements
- Stockfish WASM bundle (~2-3 MB)
- Background analysis processing
- Configurable analysis depth

---

## Phase 2: UI/UX Polish (Deferred)

### Task 2.1: Enhance Import Modal Error Handling
**Status**: 🟡 MEDIUM  
**Estimated Time**: 2 hours

**Changes Required**:
- Show inline error messages with line numbers if available
- Add "Example PGN" helper button/link
- Improve error message formatting

**Files to Modify**:
- `src/ui/ImportModal.ts`

**Acceptance Criteria**:
- Clear error messages guide user to fix PGN
- User can see example PGN format

---

### Task 2.2: Improve Renderer UI/UX
**Status**: 🟡 MEDIUM  
**Estimated Time**: 3 hours

**Changes Required**:
- Better button styling and accessibility (ARIA labels)
- Keyboard shortcuts for controls (arrow keys, spacebar)
- Responsive layout for mobile
- Move list formatting improvements
- Add aria-live region for screen readers

**Files to Modify**:
- `main.ts` (renderChessBoard method)
- `styles.css`

**Acceptance Criteria**:
- Keyboard navigation works
- Mobile-friendly layout
- Screen reader accessible
- Visual feedback for current move

---

## Phase 3: Testing & Quality Assurance (Deferred)

### Task 3.1: Add Sample PGN Test Cases
**Status**: 🟡 MEDIUM  
**Estimated Time**: 2 hours

**Changes Required**:
- Add test PGNs to `Spec/samples/`:
  - Chess.com PGN with comments
  - Lichess PGN without Elo
  - PGN with NAGs
  - PGN with variations
  - Malformed PGN (for negative tests)
- Verify all samples parse correctly

**Files to Create/Modify**:
- `Spec/samples/chesscom-game.pgn`
- `Spec/samples/lichess-game.pgn`
- `Spec/samples/complex-game.pgn`
- `Spec/samples/malformed.pgn`

**Acceptance Criteria**:
- Sample PGNs cover common scenarios
- All valid samples import successfully
- Malformed samples show appropriate errors

---

### Task 3.2: Manual QA Checklist
**Status**: 🟡 MEDIUM  
**Estimated Time**: 4 hours

**Test Scenarios**:
1. Basic Import Flow
2. Validation
3. Renderer
4. Edge Cases
5. Cross-Platform

**Files to Create**:
- `QA_CHECKLIST.md` (test results document)

**Acceptance Criteria**:
- Complete QA testing across platforms
- Document results
- Verify critical bugs fixed or documented

---

## Known Bugs (Documented)

### Hotkey Not Working
- **Status**: 🔴 Open
- **Severity**: Medium
- **Description**: Default hotkey `Mod+Alt+P` does not work
- **Workaround**: Manual assignment via Settings → Hotkeys
- **Location**: `BUGS.md`

---

## Future Enhancements

See `Spec/ROADMAP.md` for complete version roadmap (V1-V4).

