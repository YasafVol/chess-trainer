# Stockfish Main-Thread Solution

## Approach: Blocking Analysis During Import

Instead of using Web Workers (blocked), we'll:
1. Run Stockfish in the main thread during import (blocking is acceptable)
2. Save analysis results to an annotation file alongside the game note
3. Read from annotation file when displaying (fast, non-blocking)

## Implementation Plan

### 1. Main-Thread Stockfish Engine
- Use Stockfish WASM without Workers
- Initialize engine synchronously during import
- Analyze each position sequentially
- Show progress indicator to user

### 2. Annotation Storage
- Save analysis as JSON file: `Chess/games/annotations/<game-hash>.json`
- Structure:
  ```json
  {
    "gameHash": "abc123",
    "created": "2025-11-01T...",
    "evaluations": [
      {
        "ply": 0,
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "evaluation": 0,
        "depth": 15,
        "bestMove": "e2e4",
        "alternativeMoves": [...]
      },
      ...
    ],
    "mistakes": [{"ply": 5, "type": "blunder", "move": "e4e5"}],
    "criticalMoments": [{"ply": 12, "description": "..."}]
  }
  ```

### 3. chess.js Variations Support
- chess.js removes variations when loading PGN (line 1471-1474)
- Solution: Store variations separately in annotation file
- Display variations as alternative lines in UI
- Use chess.js to validate and play alternative moves

### 4. User Experience
- During import: Show "Analyzing game..." with progress
- After import: Fast display (reads from annotation file)
- Optional: Re-analyze button to update annotations

## Benefits
- ✅ Works without Workers
- ✅ Fast display (reads from file)
- ✅ Analysis can be re-run if needed
- ✅ Can show alternative lines from Stockfish analysis

## Technical Details

### Stockfish Without Workers
- Need to find or create a Stockfish build that runs synchronously
- Or use stockfish.js in main thread (may block UI)
- Use setTimeout/yield to prevent UI freezing

### Annotation File Format
- JSON for easy parsing
- Include game hash for matching
- Store evaluations per ply
- Include alternative moves (Multi-PV)

### Variations Display
- Show alternative lines as expandable variations
- Use chessboard-element to display variations
- Allow user to explore alternative lines

