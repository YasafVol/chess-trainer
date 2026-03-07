# Chess Trainer Web App Roadmap

**Vision**: Deliver a local-first chess training web app for importing, analyzing, reviewing, and practicing games directly in the browser.

---

## Active planning track

The active planning track is the web app:

1. Transition plan: `Spec/WEB_APP_TRANSITION_PLAN.md`
2. Architecture decisions: `Spec/adr/README.md`

This track is currently scoped to:

1. Standalone web app
2. In-browser Stockfish analysis
3. No auth and no cloud DB in v1

---

## V1: Local-first study app

**Status**: In progress  
**Core Value**: Import PGN games, study them locally, and analyze them in the browser.

### Features
- ✅ **PGN Import**: Multi-game paste and upload with validation
- ✅ **Game Library**: Local IndexedDB-backed game storage
- ✅ **Interactive Board**: Playable chess board with move navigation
- ✅ **Basic Controls**: Previous/Next, Reset, Play/Pause, Flip board
- ✅ **Move List**: Visual move list with current move highlighting
- ✅ **Autoplay**: Smooth move replay (~500 ms per ply)
- ✅ **Metadata**: Header extraction, hashes, and replay metadata
- ✅ **Browser analysis**: Worker-based Stockfish analysis
- ✅ **Puzzles**: Local puzzle generation and spaced review

### Reference Plans
- `Spec/WEB_APP_TRANSITION_PLAN.md`
- `Spec/WEB_APP_BACKLOG.md`
- `Spec/WEB_APP_SMOKE_CHECKLIST.md`

---

## V1.1: Hardening and release readiness

**Status**: Planned  
**Core Value**: Stabilize the current local-first web runtime for production use.

### Features
- **Stockfish Companion Service**: Local/hosted engine analysis over HTTP
- **Eval Graph**: Visual evaluation bar showing position strength over time
- **Move Annotations**: Automatic annotations for:
  - Best moves
  - Mistakes and blunders
  - Critical positions
  - Tactical opportunities
- **Analysis Note**: Second note created alongside game note with:
  - Detailed move-by-move analysis
  - Position evaluations
  - Suggested improvements
  - Key moments highlighted

### Focus Areas
- Route-level UI tests
- Accessibility pass
- Import/export backup flow
- Deployment smoke automation
- Vercel production hardening

---

## V2: Cloud Integration - API Importers

**Status**: 📋 Planned  
**Core Value**: Automatic import from chess platforms

### Features
- **Chess.com Integration**:
  - Import recent games automatically
  - Scheduled sync
  - User profile linking
- **Lichess Integration**:
  - Import games by username
  - Study integration
  - Tournament games
- **Bulk Import**:
  - Import multiple games at once
  - Filter by date, opponent, result
  - Batch processing progress

### Notes
- Still out of scope for the local-first release.

---

## V3: Advanced Analysis & Database

**Status**: 📋 Future  
**Core Value**: Deep game database and advanced analysis tools

### Features
- **Opening Database**:
  - ECO code lookup with full opening trees
  - Transposition detection
  - Opening statistics from user's games
- **Game Database Search**:
  - Search by opening, player, result, date
  - Position search (find similar positions)
  - Opening repertoire analysis
- **Advanced Analytics**:
  - Performance graphs over time
  - Opening success rates
  - Time pressure analysis
  - Color preference statistics
- **Export/Import**:
  - Export games to PGN
  - Import from databases (ChessBase, etc.)
  - Cloud sync/backup

### Notes
- Still out of scope for the local-first release.

---

## V4: Customization & Settings

**Status**: 📋 Future  
**Core Value**: Full customization of appearance and behavior

### Notes
- Browser customization, themes, and advanced replay settings remain future work.

---

## Core Principles Across All Versions

1. **Offline-First**: All core functionality works without internet
2. **Web-Native**: Browser-first architecture with local persistence and worker-based analysis
3. **Performance**: Fast, responsive, low memory footprint
4. **Accessibility**: Keyboard navigation and screen reader support
5. **Privacy**: User data stays local unless explicitly synced
6. **Extensibility**: Layered architecture supports future enhancements

---

## Milestone Summary

| Version | Focus | Key Deliverable | Status |
|---------|-------|-----------------|--------|
| **V1** | Local-first study | Import, replay, analysis, puzzles | 🟡 In Progress |
| **V1.1** | Hardening | UI tests, accessibility, deployment readiness | 📋 Planned |
| **V2** | Integration | Chess.com & Lichess import automation | 📋 Planned |
| **V3** | Database | Advanced search, repertoire, analytics | 📋 Future |
| **V4** | Customization | Full settings & appearance control | 📋 Future |

---

## Version Dependencies

- **V1** → Foundation for all future versions
- **V1.1** → Hardens V1 for production
- **V2** → Requires V0; optional V1/V1.5 for richer metadata
- **V3** → Requires V1 (analysis) and benefits from V2 imports
- **V4** → Can build after core workflows (V0–V3) are stable

---

**Last Updated**: 2025-11-02  
**Current Version**: V1 local-first web app  
**Next Focus**: V1.1 hardening and release readiness  
**Reference Plans**: `Spec/WEB_APP_TRANSITION_PLAN.md`, `Spec/WEB_APP_BACKLOG.md`, `Spec/WEB_APP_SMOKE_CHECKLIST.md`
