# Implementation Plan: Chess Trainer V2 Plugin

## Executive Summary

This document outlines the implementation plan for Chess Trainer V2, which adds cloud integration capabilities to import games automatically from Chess.com and Lichess APIs.

**Target Release**: Post-V1 (after game analysis features)  
**Core Value**: Automatic import from chess platforms without manual PGN pasting

**Dependencies**:
- V0 foundation (complete)
- V1 game analysis (optional but recommended for enhanced import)

---

## V2 Features Overview

### Chess.com Integration
- Import recent games automatically
- Scheduled sync
- User profile linking

### Lichess Integration
- Import games by username
- Study integration
- Tournament games

### Bulk Import
- Import multiple games at once
- Filter by date, opponent, result
- Batch processing progress

### Technical Requirements
- API authentication (OAuth where needed)
- Rate limiting and error handling
- Background sync capabilities
- Configurable sync intervals

---

## Milestones

### Milestone 1: API Infrastructure & Authentication (Days 1-7)
**Exit criteria**: Basic API client infrastructure exists, authentication flows work for both platforms, rate limiting implemented.

**Tasks**:
1. **API Client Base**
   - [ ] Create `src/services/api/BaseApiClient.ts` with rate limiting
   - [ ] Implement request retry logic with exponential backoff
   - [ ] Add error handling and HTTP status code management
   - [ ] Create rate limit tracking per API endpoint

2. **Chess.com API Client**
   - [ ] Create `src/services/api/ChessComClient.ts`
   - [ ] Implement public API endpoints (no auth required initially):
     - [ ] Get user games: `GET /pub/player/{username}/games/{YYYY}/{MM}`
     - [ ] Get game details: `GET /pub/game/{id}`
   - [ ] Parse Chess.com PGN format
   - [ ] Handle pagination for game lists

3. **Lichess API Client**
   - [ ] Create `src/services/api/LichessClient.ts`
   - [ ] Implement public API endpoints:
     - [ ] Export user games: `GET /api/games/user/{username}`
     - [ ] Get game details: `GET /api/game/{gameId}`
   - [ ] Parse Lichess PGN format (NDN notation)
   - [ ] Handle streaming response format

4. **Authentication (Future Enhancement)**
   - [ ] Research OAuth flows for both platforms
   - [ ] Create settings UI for API keys/tokens
   - [ ] Store credentials securely (Obsidian vault-safe storage)

**Deliverables**:
- Working API clients for both platforms
- Rate limiting infrastructure
- Error handling framework

---

### Milestone 2: User Settings & Configuration (Days 8-10)
**Exit criteria**: Settings tab exists, users can configure sync preferences, import sources, and filters.

**Tasks**:
1. **Settings Tab**
   - [ ] Create `src/ui/SettingsTab.ts` extending Obsidian's `PluginSettingTab`
   - [ ] Add settings for:
     - [ ] Chess.com username
     - [ ] Lichess username
     - [ ] Auto-sync enabled/disabled
     - [ ] Sync interval (daily, weekly, manual)
     - [ ] Default filters (date range, result, opponent)
     - [ ] Auto-create notes on sync (yes/no)

2. **Settings Storage**
   - [ ] Extend plugin settings interface (`src/types/settings.ts`)
   - [ ] Implement `loadSettings()` and `saveSettings()`
   - [ ] Add settings validation

3. **Import Preferences**
   - [ ] Date range picker for bulk imports
   - [ ] Result filter (all, wins, losses, draws)
   - [ ] Opponent filter (any, specific username)
   - [ ] Game type filter (rated, casual, etc.)

**Deliverables**:
- Functional settings tab
- Persistent configuration
- User preferences management

---

### Milestone 3: Manual Import UI (Days 11-14)
**Exit criteria**: Users can manually trigger imports from Chess.com/Lichess via modal, see progress, and import multiple games.

**Tasks**:
1. **Import Modal Enhancements**
   - [ ] Update `src/ui/ImportModal.ts` to support multiple sources
   - [ ] Add tab/selector for source type (Manual PGN, Chess.com, Lichess)
   - [ ] For Chess.com/Lichess tabs:
     - [ ] Username input
     - [ ] Date range selector
     - [ ] Filter options
     - [ ] "Fetch Games" button

2. **Game List UI**
   - [ ] Display fetched games in table/list format
   - [ ] Show: date, white player, black player, result, time control
   - [ ] Checkbox selection for bulk import
   - [ ] "Import Selected" button

3. **Import Progress**
   - [ ] Show progress bar for bulk imports
   - [ ] Display current game being imported
   - [ ] Show success/failure counts
   - [ ] Allow cancel operation

4. **Error Handling**
   - [ ] Handle API errors gracefully
   - [ ] Show user-friendly error messages
   - [ ] Retry failed imports option
   - [ ] Log import failures

**Deliverables**:
- Enhanced import modal with API source tabs
- Game list display
- Bulk import with progress tracking

---

### Milestone 4: Bulk Import Service (Days 15-18)
**Exit criteria**: Bulk import service processes multiple games efficiently, creates notes, handles duplicates, and provides progress feedback.

**Tasks**:
1. **Bulk Import Service**
   - [ ] Create `src/services/BulkImportService.ts`
   - [ ] Implement game fetching logic (use existing API clients)
   - [ ] Process games in batches (configurable batch size)
   - [ ] Handle duplicate detection (by hash or game ID)
   - [ ] Integrate with existing note creation logic

2. **Duplicate Handling**
   - [ ] Check existing notes by hash before import
   - [ ] Option to skip, overwrite, or rename duplicates
   - [ ] Store imported game IDs to prevent re-imports

3. **Progress Tracking**
   - [ ] Emit progress events (game count, current game)
   - [ ] Update UI in real-time
   - [ ] Persist progress for recovery on crash

4. **Note Creation Integration**
   - [ ] Reuse `processPgnImport()` from V0
   - [ ] Add source metadata to frontmatter (`source: chess.com` or `source: lichess`)
   - [ ] Include API-specific metadata (game ID, URL, etc.)

**Deliverables**:
- Bulk import service
- Duplicate detection and handling
- Progress tracking system

---

### Milestone 5: Auto-Sync (Days 19-21)
**Exit criteria**: Background sync runs on schedule, imports new games automatically, and notifies users of sync results.

**Tasks**:
1. **Sync Scheduler**
   - [ ] Create `src/services/SyncScheduler.ts`
   - [ ] Use Obsidian's interval registration
   - [ ] Implement daily/weekly sync schedule
   - [ ] Store last sync timestamp

2. **Incremental Sync**
   - [ ] Fetch only games since last sync date
   - [ ] Track last imported game ID per source
   - [ ] Skip already imported games

3. **Sync Notifications**
   - [ ] Show notice when sync completes
   - [ ] Display count of new games imported
   - [ ] Show errors if sync fails
   - [ ] Optional: Badge on ribbon icon for new games

4. **Manual Sync Trigger**
   - [ ] Add "Sync Now" command
   - [ ] Add ribbon button option (optional)
   - [ ] Show sync progress in status bar

**Deliverables**:
- Background sync scheduler
- Incremental import logic
- User notifications

---

### Milestone 6: Testing & Documentation (Days 22-24)
**Exit criteria**: Manual QA complete, documentation updated, edge cases handled.

**Tasks**:
1. **Manual QA**
   - [ ] Test Chess.com import with various usernames
   - [ ] Test Lichess import with various usernames
   - [ ] Test bulk import with filters
   - [ ] Test auto-sync functionality
   - [ ] Test duplicate handling
   - [ ] Test error scenarios (invalid username, API downtime)

2. **Edge Cases**
   - [ ] Handle users with thousands of games
   - [ ] Handle API rate limits gracefully
   - [ ] Handle network failures
   - [ ] Handle malformed API responses
   - [ ] Handle missing PGN data

3. **Documentation**
   - [ ] Update README with V2 features
   - [ ] Document API integration setup
   - [ ] Add troubleshooting section for API issues
   - [ ] Document rate limits and best practices

4. **Performance**
   - [ ] Optimize bulk import performance
   - [ ] Batch API requests where possible
   - [ ] Cache user profiles if needed
   - [ ] Monitor memory usage during bulk imports

**Deliverables**:
- QA checklist completed
- Updated documentation
- Performance optimizations

---

## Technical Architecture

### File Structure
```
src/
  services/
    api/
      BaseApiClient.ts      # Base API client with rate limiting
      ChessComClient.ts     # Chess.com API client
      LichessClient.ts      # Lichess API client
    BulkImportService.ts    # Bulk import orchestration
    SyncScheduler.ts        # Background sync scheduler
  ui/
    SettingsTab.ts          # Settings UI
    ImportModal.ts          # Enhanced import modal
  types/
    settings.ts             # Settings interface
    api.ts                  # API response types
```

### Dependencies
- No new external dependencies (uses fetch API)
- Rate limiting library (optional, can implement manually)
- Date parsing library (optional, can use native Date)

---

## Risk Assessment

### High Risk Items

1. **API Rate Limits**
   - **Risk**: Exceeding rate limits causes failures
   - **Mitigation**: Implement rate limiting, respect API headers, add retry logic

2. **Large Game Lists**
   - **Risk**: Users with thousands of games cause performance issues
   - **Mitigation**: Pagination, incremental sync, batch processing

3. **API Changes**
   - **Risk**: Chess.com/Lichess API changes break integration
   - **Mitigation**: Version API endpoints, add error handling, monitor API status

### Medium Risk Items

1. **Authentication Complexity**
   - **Risk**: OAuth flows add complexity
   - **Mitigation**: Start with public APIs, add OAuth later if needed

2. **Network Failures**
   - **Risk**: Intermittent network issues cause sync failures
   - **Mitigation**: Retry logic, queue failed imports, manual retry option

---

## Timeline Estimate

**Total Estimated Time**: 24 days (~4-5 weeks)

- **Week 1**: Milestone 1 (API Infrastructure)
- **Week 2**: Milestones 2 & 3 (Settings & Manual Import UI)
- **Week 3**: Milestones 4 & 5 (Bulk Import & Auto-Sync)
- **Week 4**: Milestone 6 (Testing & Documentation)

---

## Success Criteria

### Definition of Done

1. ✅ Users can configure Chess.com and Lichess usernames
2. ✅ Users can manually import games from both platforms
3. ✅ Bulk import works with filters and progress tracking
4. ✅ Auto-sync runs on schedule and imports new games
5. ✅ Duplicate detection prevents re-imports
6. ✅ Error handling provides clear user feedback
7. ✅ Documentation updated with V2 features
8. ✅ Performance acceptable for users with many games

---

## Future Enhancements (Post-V2)

- OAuth authentication for private game access
- Real-time game notifications
- Import from other platforms (ChessBase, etc.)
- Export games back to platforms
- Two-way sync (update games on platforms from Obsidian)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Owner**: Development Team

