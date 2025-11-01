# Implementation Plan: Chess Trainer V1.5 Plugin

## Executive Summary

This document outlines the implementation plan for Chess Trainer V1.5, which adds puzzle generation and training capabilities by extracting blunders and mistakes from analyzed games.

**Target Release**: Post-V1 (after game analysis)  
**Core Value**: Generate training puzzles from game mistakes to improve chess skills

**Dependencies**:
- V0 foundation (complete)
- V1 game analysis (REQUIRED - needs Stockfish integration)
- V2 cloud integration (optional but recommended for more game data)

---

## V1.5 Features Overview

### Puzzle Generation
- Extract blunders/mistakes from analyzed games
- Create puzzle notes with hidden solutions
- Difficulty rating based on eval changes

### Training Mode
- Puzzle solving interface
- Solution reveal on demand
- Hint system
- Progress tracking

### Puzzle Organization
- Tag-based categorization
- Difficulty levels
- Theme-based puzzles (tactics, endgames, etc.)

### Technical Requirements
- Puzzle detection algorithm
- Position evaluation comparison
- Puzzle storage and indexing

---

## Milestones

### Milestone 1: Puzzle Detection & Extraction (Days 1-5)
**Exit criteria**: Algorithm can identify blunders, mistakes, and critical positions from analyzed games, extract puzzle positions, and calculate difficulty ratings.

**Tasks**:
1. **Position Analysis Service**
   - [ ] Create `src/services/puzzle/PuzzleDetector.ts`
   - [ ] Integrate with V1 analysis data (Stockfish evaluations)
   - [ ] Identify position evaluation drops (blunders: >200cp, mistakes: 100-200cp)
   - [ ] Extract positions before and after mistakes
   - [ ] Calculate puzzle difficulty based on:
     - [ ] Eval change magnitude
     - [ ] Position complexity
     - [ ] Required move sequence length

2. **Blunder Detection Algorithm**
   - [ ] Analyze move-by-move evaluations
   - [ ] Detect significant eval drops (>100cp)
   - [ ] Identify the move that caused the mistake
   - [ ] Extract the position before the mistake
   - [ ] Classify mistake type (tactical, positional, endgame)

3. **Puzzle Position Extraction**
   - [ ] Extract FEN position before mistake
   - [ ] Extract correct move sequence (best moves)
   - [ ] Extract incorrect move sequence (actual move)
   - [ ] Store move context (move number, game phase)

4. **Difficulty Rating**
   - [ ] Create `src/services/puzzle/DifficultyRater.ts`
   - [ ] Rate puzzles 1-5 stars based on:
     - [ ] Eval change magnitude
     - [ ] Required calculation depth
     - [ ] Position complexity
   - [ ] Categorize by theme (tactics, endgame, positional)

**Deliverables**:
- Puzzle detection algorithm
- Difficulty rating system
- Position extraction logic

---

### Milestone 2: Puzzle Note Generation (Days 6-9)
**Exit criteria**: Puzzle notes are created with correct structure, hidden solutions, and metadata.

**Tasks**:
1. **Puzzle Note Template**
   - [ ] Create `src/services/puzzle/PuzzleNoteGenerator.ts`
   - [ ] Design puzzle note structure:
     - [ ] Frontmatter (difficulty, theme, source game, date)
     - [ ] Puzzle board (interactive position)
     - [ ] Hidden solution section
     - [ ] Analysis section
   - [ ] Define puzzle note location (`Chess/puzzles/`)

2. **Solution Hiding**
   - [ ] Implement collapsible solution section
   - [ ] Use Obsidian callouts or collapsible sections
   - [ ] Add "Show Solution" button
   - [ ] Hide solution by default

3. **Puzzle Metadata**
   - [ ] Store puzzle frontmatter:
     - [ ] `puzzle_type`: blunder/mistake/inaccuracy
     - [ ] `difficulty`: 1-5 stars
     - [ ] `theme`: tactics/endgame/positional
     - [ ] `source_game`: link to original game
     - [ ] `eval_change`: centipawns lost
     - [ ] `best_move`: correct move sequence
     - [ ] `played_move`: incorrect move
   - [ ] Add puzzle tags automatically

4. **Board Integration**
   - [ ] Embed interactive board in puzzle note
   - [ ] Pre-set position to puzzle position
   - [ ] Disable move input initially (view-only mode)
   - [ ] Enable move input when solving

**Deliverables**:
- Puzzle note generation service
- Solution hiding mechanism
- Complete puzzle note structure

---

### Milestone 3: Training Interface (Days 10-14)
**Exit criteria**: Users can solve puzzles interactively, get hints, reveal solutions, and track progress.

**Tasks**:
1. **Puzzle Solving UI**
   - [ ] Create `src/ui/PuzzleViewer.ts`
   - [ ] Render puzzle board in solving mode
   - [ ] Allow move input via board clicks
   - [ ] Validate moves against solution
   - [ ] Show "Correct" or "Incorrect" feedback

2. **Hint System**
   - [ ] Implement progressive hints:
     - [ ] Level 1: General hint (e.g., "Look for tactics")
     - [ ] Level 2: Piece hint (e.g., "Consider the rook")
     - [ ] Level 3: Square hint (e.g., "Focus on e5")
   - [ ] Add "Get Hint" button
   - [ ] Limit hints per puzzle (e.g., 3 max)

3. **Solution Reveal**
   - [ ] Add "Show Solution" button
   - [ ] Reveal correct move sequence
   - [ ] Animate solution moves on board
   - [ ] Show explanation text
   - [ ] Display evaluation changes

4. **Progress Tracking**
   - [ ] Track puzzle attempts
   - [ ] Store solved puzzles (by puzzle ID)
   - [ ] Calculate success rate
   - [ ] Track improvement over time
   - [ ] Store progress in puzzle metadata

**Deliverables**:
- Interactive puzzle solving interface
- Hint system
- Solution reveal mechanism
- Progress tracking

---

### Milestone 4: Puzzle Organization & Management (Days 15-17)
**Exit criteria**: Users can organize puzzles by difficulty, theme, and source, filter puzzles, and track progress.

**Tasks**:
1. **Puzzle Index**
   - [ ] Create `src/services/puzzle/PuzzleIndex.ts`
   - [ ] Build index of all puzzles from notes
   - [ ] Parse puzzle frontmatter
   - [ ] Categorize by difficulty, theme, source
   - [ ] Update index when new puzzles created

2. **Puzzle Filtering**
   - [ ] Create `src/ui/PuzzleBrowser.ts`
   - [ ] Filter by difficulty (1-5 stars)
   - [ ] Filter by theme (tactics, endgame, positional)
   - [ ] Filter by solved/unsolved status
   - [ ] Filter by source game
   - [ ] Search by tags

3. **Puzzle Statistics**
   - [ ] Create `src/services/puzzle/PuzzleStats.ts`
   - [ ] Calculate total puzzles solved
   - [ ] Success rate per difficulty
   - [ ] Success rate per theme
   - [ ] Improvement trends
   - [ ] Display in dashboard view

4. **Bulk Puzzle Generation**
   - [ ] Add command: "Generate Puzzles from Game"
   - [ ] Analyze game and extract all puzzles
   - [ ] Create multiple puzzle notes at once
   - [ ] Show progress during generation
   - [ ] Skip duplicates (by position hash)

**Deliverables**:
- Puzzle indexing system
- Puzzle browser UI
- Statistics dashboard
- Bulk generation feature

---

### Milestone 5: Puzzle Themes & Categorization (Days 18-20)
**Exit criteria**: Puzzles are automatically categorized by theme, users can filter by theme, and theme-specific training modes exist.

**Tasks**:
1. **Theme Detection**
   - [ ] Create `src/services/puzzle/ThemeDetector.ts`
   - [ ] Detect tactical themes:
     - [ ] Checkmate patterns
     - [ ] Fork/discovered attacks
     - [ ] Pins/skewers
     - [ ] Back rank weaknesses
   - [ ] Detect endgame themes:
     - [ ] King and pawn endgames
     - [ ] Rook endgames
     - [ ] Piece endgames
   - [ ] Detect positional themes:
     - [ ] Pawn structure
     - [ ] Piece placement
     - [ ] Prophylaxis

2. **Theme Classification**
   - [ ] Analyze position characteristics
   - [ ] Match patterns to themes
   - [ ] Assign primary and secondary themes
   - [ ] Store themes in puzzle metadata

3. **Theme-Based Training**
   - [ ] Create theme-specific training modes
   - [ ] Filter puzzles by selected theme
   - [ ] Track progress per theme
   - [ ] Recommend themes based on weaknesses

4. **Theme Tags**
   - [ ] Auto-tag puzzles with themes
   - [ ] Use Obsidian tags for organization
   - [ ] Enable tag-based filtering
   - [ ] Create tag hierarchy

**Deliverables**:
- Theme detection algorithm
- Automatic categorization
- Theme-based training modes

---

### Milestone 6: Testing & Documentation (Days 21-23)
**Exit criteria**: Manual QA complete, documentation updated, puzzle generation works reliably.

**Tasks**:
1. **Manual QA**
   - [ ] Test puzzle generation from various games
   - [ ] Test puzzle solving interface
   - [ ] Test hint system
   - [ ] Test solution reveal
   - [ ] Test progress tracking
   - [ ] Test filtering and organization

2. **Edge Cases**
   - [ ] Handle games with no mistakes
   - [ ] Handle games with many mistakes
   - [ ] Handle invalid puzzle positions
   - [ ] Handle duplicate puzzles
   - [ ] Handle very difficult puzzles

3. **Performance**
   - [ ] Optimize puzzle generation speed
   - [ ] Optimize puzzle index building
   - [ ] Test with large puzzle collections (1000+)
   - [ ] Monitor memory usage

4. **Documentation**
- [ ] Update README with V1.5 features
   - [ ] Document puzzle generation process
   - [ ] Document training interface usage
   - [ ] Add troubleshooting section
   - [ ] Document puzzle themes and categories

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
    puzzle/
      PuzzleDetector.ts        # Detects mistakes and extracts puzzles
      DifficultyRater.ts        # Rates puzzle difficulty
      PuzzleNoteGenerator.ts   # Generates puzzle notes
      PuzzleIndex.ts            # Indexes and organizes puzzles
      PuzzleStats.ts            # Calculates statistics
      ThemeDetector.ts          # Detects puzzle themes
  ui/
    PuzzleViewer.ts             # Interactive puzzle solving UI
    PuzzleBrowser.ts            # Puzzle filtering and browsing
  types/
    puzzle.ts                   # Puzzle-related types
```

### Dependencies
- V1 analysis data (Stockfish evaluations)
- chess.js for position validation
- Existing board rendering (from V0)

---

## Puzzle Generation Algorithm

### Detection Logic
1. **Load analyzed game** (from V1 analysis note)
2. **Iterate through moves** with evaluations
3. **Detect eval drops**:
   - Blunder: >200cp loss
   - Mistake: 100-200cp loss
   - Inaccuracy: 50-100cp loss
4. **Extract puzzle position**:
   - Position before mistake
   - Best move sequence
   - Actual move played
5. **Calculate difficulty**:
   - Based on eval change
   - Based on move complexity
   - Based on position complexity

### Puzzle Note Structure
```markdown
---
puzzle_type: blunder
difficulty: 4
theme: tactics
source_game: Chess/games/2025-01-15 Game.md
eval_change: -250
best_move: "Qd5+"
played_move: "Qe4"
date: "2025-01-15"
tags: [puzzle, tactics, blunder]
---

# Puzzle: Find the Best Move

{{chess-board position="..."}}

## Solution

> [!solution] Click to reveal solution
> 
> **Best Move**: Qd5+
> 
> This move creates a discovered attack...

## Analysis

The position arose from a tactical oversight...
```

---

## Risk Assessment

### High Risk Items

1. **V1 Dependency**
   - **Risk**: Puzzle generation requires V1 analysis features
- **Mitigation**: Ensure V1 is complete before starting V1.5, or provide fallback for games without analysis

2. **Puzzle Quality**
   - **Risk**: Low-quality puzzles frustrate users
   - **Mitigation**: Strict difficulty rating, theme detection, manual review option

3. **Performance**
   - **Risk**: Generating puzzles from many games is slow
   - **Mitigation**: Batch processing, background generation, progress indicators

### Medium Risk Items

1. **Theme Detection Accuracy**
   - **Risk**: Incorrect theme classification
   - **Mitigation**: Pattern matching, machine learning (future), user feedback

2. **Duplicate Puzzles**
   - **Risk**: Same puzzle generated multiple times
   - **Mitigation**: Position hash comparison, deduplication logic

---

## Timeline Estimate

**Total Estimated Time**: 23 days (~4-5 weeks)

- **Week 1**: Milestones 1 & 2 (Detection & Note Generation)
- **Week 2**: Milestone 3 (Training Interface)
- **Week 3**: Milestones 4 & 5 (Organization & Themes)
- **Week 4**: Milestone 6 (Testing & Documentation)

---

## Success Criteria

### Definition of Done

1. ✅ Puzzles are automatically generated from analyzed games
2. ✅ Puzzles have hidden solutions and difficulty ratings
3. ✅ Users can solve puzzles interactively
4. ✅ Hint system provides progressive assistance
5. ✅ Puzzles are organized by difficulty and theme
6. ✅ Progress tracking works accurately
7. ✅ Puzzle generation is performant
8. ✅ Documentation is complete

---

## Future Enhancements (Post-V1.5)

- AI-powered puzzle generation (beyond game mistakes)
- Custom puzzle creation by users
- Puzzle sharing between users
- Adaptive difficulty based on user performance
- Puzzle collections and courses
- Spaced repetition system for puzzle review

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Owner**: Development Team

