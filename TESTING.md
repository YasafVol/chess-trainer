# Chess Trainer V1 Testing Guide

This document outlines testing steps for the Chess Trainer V1 implementation (Companion Stockfish Service).

## Prerequisites

1. **Stockfish binary installed**
   - macOS: `brew install stockfish`
   - Linux: `sudo apt-get install stockfish` or `sudo pacman -S stockfish`
   - Windows: Download from https://stockfishchess.org/download/
   - Verify: Run `stockfish` in terminal, should show UCI prompt

2. **Node.js installed** (18+)
   - Verify: `node --version`

3. **Plugin built and installed**
   - Ensure `main.js`, `manifest.json` are in `.obsidian/plugins/chess-trainer/`
   - Plugin enabled in Obsidian Settings → Community plugins

---

## Test 1: Companion Service Setup

### Objective
Verify the Stockfish companion service runs correctly.

### Steps

1. **Install service dependencies:**
   ```bash
   cd stockfish-service
   npm install
   ```

2. **Build the service:**
   ```bash
   npm run build
   ```

3. **Start the service:**
   ```bash
   npm start
   ```

### Expected Results
- Service starts without errors
- Console shows: "Stockfish Companion Service listening on port 9898"
- Console shows: "Stockfish engine ready"

### Manual API Test

4. **Test health endpoint** (in another terminal):
   ```bash
   curl http://localhost:9898/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "engine": "ready",
     "version": "Stockfish 16" (or similar)
   }
   ```

5. **Test analysis endpoint:**
   ```bash
   curl -X POST http://localhost:9898/analyze \
     -H "Content-Type: application/json" \
     -d '{"depth": 10}'
   ```

   Expected response includes:
   - `bestMove`: A valid UCI move (e.g., "e2e4")
   - `evaluation`: Object with `type` and `value`
   - `lines`: Array with at least one PV line
   - `statistics`: Object with `depth`, `nodes`, `nps`
   - `timingMs`: Number > 0

### Troubleshooting
- **Service fails to start**: Check Stockfish is in PATH (`which stockfish`)
- **Health check fails**: Check console for error messages
- **Analysis timeout**: Try reducing depth or check engine is running

---

## Test 2: Plugin Settings Configuration

### Objective
Verify plugin settings UI and persistence.

### Steps

1. **Open Settings in Obsidian:**
   - Settings → Community plugins → Chess Trainer

2. **Verify settings tab appears:**
   - Should see "Chess Trainer Settings" heading
   - Should see "Analysis Settings" section

3. **Test each setting:**
   - **Enable analysis**: Toggle on/off
   - **Service URL**: Change to `http://localhost:9898` (should be default)
   - **Default depth**: Move slider (should show value 1-30)
   - **Default multi-PV**: Move slider (should show value 1-10)
   - **Default movetime**: Enter a number (e.g., 5000)

4. **Verify persistence:**
   - Close and reopen settings
   - Settings should retain values

### Expected Results
- All settings controls are visible and functional
- Values persist after closing/reopening settings
- No console errors

---

## Test 3: Service Connection Test

### Objective
Verify plugin can connect to companion service.

### Steps

1. **Start companion service** (if not running):
   ```bash
   cd stockfish-service
   npm start
   ```

2. **Configure plugin:**
   - Settings → Chess Trainer
   - Enable "Enable analysis"
   - Set "Service URL" to `http://localhost:9898`
   - Save settings

3. **Test connection:**
   - Import a simple PGN game (see Test 4)
   - Check console for "Settings tab registered"
   - Check console for any connection errors

### Expected Results
- Plugin connects to service without errors
- Console shows successful connection messages
- No "service not reachable" notices

### Error Case Test

4. **Stop the service:**
   - Press Ctrl+C in service terminal

5. **Try importing a game:**
   - Should see notice: "Stockfish companion service not reachable..."
   - Plugin should not crash

---

## Test 4: Game Import with Analysis

### Objective
Verify end-to-end workflow: import PGN → automatic analysis.

### Steps

1. **Ensure service is running:**
   ```bash
   cd stockfish-service
   npm start
   ```

2. **Enable analysis in plugin settings:**
   - Settings → Chess Trainer
   - Enable "Enable analysis"
   - Set depth to 10 (for faster testing)
   - Save settings

3. **Import a simple game:**
   - Use command palette: "Chess Trainer: Import PGN"
   - Or click ribbon icon
   - Paste this test PGN:
     ```
     [Event "Test Game"]
     [Site "Test"]
     [Date "2024.01.01"]
     [Round "1"]
     [White "Test Player"]
     [Black "Test Opponent"]
     [Result "1-0"]

     1. e4 e5 2. Nf3 Nc6 3. Bb5 *
     ```

4. **Observe analysis process:**
   - Notice should appear: "Analyzing game with Stockfish..."
   - Wait for completion (should take 10-30 seconds with depth 10)
   - Notice should appear: "✅ Game analysis complete! Analyzed X moves."

5. **Verify analysis file created:**
   - Navigate to `Chess/games/annotations/`
   - Should see a JSON file with game hash as filename
   - Open file, verify it contains:
     - `moves`: Array of move analyses
     - `statistics`: Object with accuracy, bestMoves, etc.
     - `depth`: 10 (or your configured depth)

### Expected Results
- Game imports successfully
- Analysis runs automatically
- Analysis file created in annotations folder
- Console shows analysis completion messages
- No errors or crashes

---

## Test 5: Manual Analysis Command

### Objective
Verify manual "Analyze current game" command works.

### Steps

1. **Open an existing game note:**
   - Navigate to a game note in `Chess/games/`
   - Game should have a `chess-pgn` code block

2. **Run manual analysis:**
   - Command palette: "Chess Trainer: Analyze current game"
   - Or ensure analysis is enabled in settings

3. **Observe analysis:**
   - Notice: "Analyzing game with Stockfish..."
   - Wait for completion
   - Notice: "✅ Game analysis complete!"

4. **Verify analysis file:**
   - Check `Chess/games/annotations/` folder
   - Should see/update analysis JSON file

### Expected Results
- Command executes successfully
- Analysis completes for existing game
- Analysis file created/updated

---

## Test 6: Error Handling

### Objective
Verify graceful error handling in various scenarios.

### Test Cases

#### 6.1 Service Offline
1. Stop companion service
2. Try importing a game
3. **Expected**: Notice appears: "Stockfish companion service not reachable..."
4. **Expected**: Plugin continues to work, game imports successfully

#### 6.2 Invalid Service URL
1. Settings → Chess Trainer
2. Set "Service URL" to `http://localhost:9999` (non-existent port)
3. Try importing a game
4. **Expected**: Error notice, plugin doesn't crash

#### 6.3 Analysis Timeout
1. Set depth to 30 (very deep)
2. Import a complex game
3. **Expected**: Either completes (if fast) or times out gracefully

#### 6.4 Invalid PGN
1. Try importing malformed PGN
2. **Expected**: Validation error, no analysis attempted

---

## Test 7: Multi-PV Analysis

### Objective
Verify multi-PV (multiple principal variations) works.

### Steps

1. **Configure multi-PV:**
   - Settings → Chess Trainer
   - Set "Default multi-PV" to 3
   - Save settings

2. **Import a game:**
   - Use test PGN from Test 4

3. **Check analysis file:**
   - Open the generated annotation JSON
   - Check `moves` array
   - Each move's `positionEvaluation` should have:
     - `alternativeMoves`: Array with up to 2 additional moves (since we asked for 3 total)

### Expected Results
- Analysis includes multiple PV lines
- Alternative moves are stored in analysis data
- No errors with multi-PV > 1

---

## Test 8: Performance Testing

### Objective
Verify analysis performance for different game lengths.

### Test Cases

#### 8.1 Short Game (10-20 moves)
1. Import short game
2. Set depth to 14
3. **Measure**: Analysis time
4. **Expected**: Completes in < 30 seconds

#### 8.2 Medium Game (30-50 moves)
1. Import medium game
2. Set depth to 14
3. **Measure**: Analysis time
4. **Expected**: Completes in < 2 minutes

#### 8.3 Long Game (80+ moves)
1. Import long game
2. Set depth to 10 (reduced for performance)
3. **Measure**: Analysis time
4. **Expected**: Completes without timeout

### Notes
- Analysis time scales with game length
- Consider reducing depth for very long games
- Monitor service console for performance metrics

---

## Test 9: Settings Validation

### Objective
Verify settings validation and edge cases.

### Test Cases

#### 9.1 Invalid URL Format
1. Settings → Service URL
2. Enter invalid URL: `not-a-url`
3. **Expected**: Setting still saves (validation happens on use)

#### 9.2 Depth Limits
1. Settings → Default depth
2. Set to 1 (minimum)
3. Set to 30 (maximum)
4. **Expected**: Slider respects limits

#### 9.3 Movetime Edge Cases
1. Settings → Default movetime
2. Enter 0 (use depth)
3. Enter negative number
4. **Expected**: Only accepts valid numbers >= 0

---

## Test 10: Integration Test - Full Workflow

### Objective
Test complete user workflow from import to analysis.

### Steps

1. **Start fresh:**
   - Ensure service is running
   - Plugin settings configured
   - Analysis enabled

2. **Import game:**
   - Import a real game (from Chess.com or Lichess)
   - Use a game with 20-40 moves

3. **Verify game note:**
   - Note created in `Chess/games/`
   - Board renders correctly
   - Moves are playable

4. **Verify analysis:**
   - Analysis file created automatically
   - Check analysis statistics:
     - Accuracy percentage
     - Best moves count
     - Mistakes/blunders identified

5. **Verify analysis quality:**
   - Open analysis JSON
   - Check evaluations are reasonable (not all 0)
   - Check move classifications make sense

### Expected Results
- Complete workflow works end-to-end
- All components function together
- Analysis data is meaningful and useful

---

## Success Criteria

All tests should pass with:
- ✅ No plugin crashes
- ✅ No console errors (except expected warnings)
- ✅ Service starts and responds correctly
- ✅ Settings persist and work correctly
- ✅ Analysis completes successfully
- ✅ Error handling works gracefully
- ✅ Analysis files are created correctly
- ✅ Performance is acceptable (< 2 min for typical games)

---

## Troubleshooting

### Service won't start
- Check Stockfish is installed: `which stockfish`
- Check Node.js version: `node --version` (needs 18+)
- Check port 9898 is available: `lsof -i :9898`

### Analysis fails
- Check service is running: `curl http://localhost:9898/health`
- Check console for errors
- Try reducing depth in settings
- Verify PGN is valid

### Settings not saving
- Check console for errors
- Verify plugin is enabled
- Try disabling and re-enabling plugin

### Analysis file not created
- Check `Chess/games/annotations/` folder exists
- Check console for file creation errors
- Verify game hash is being generated

---

## Next Steps After Testing

Once all tests pass:
1. Document any issues found
2. Update README with setup instructions
3. Consider performance optimizations if needed
4. Plan for hosted service deployment (optional)

