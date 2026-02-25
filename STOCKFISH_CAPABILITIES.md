# Stockfish Analysis Capabilities

## What We're Currently Getting

### From Stockfish Service (`stockfish-service/src/types.ts`)

Our companion service extracts the following from Stockfish UCI output:

1. **Best Move** (`bestMove: string`)
   - The engine's recommended move in UCI notation (e.g., "e2e4")
   - Currently converted to SAN notation for display

2. **Ponder Move** (`ponder?: string`)
   - The move Stockfish expects the opponent to play
   - Currently captured but not actively used

3. **Evaluation** (`evaluation: { type: 'cp' | 'mate', value: number }`)
   - **Centipawns (cp)**: Position evaluation in centipawns (positive = white advantage, negative = black advantage)
   - **Mate (mate)**: Number of moves until checkmate (positive = white mates, negative = black mates)
   - Currently converted to centipawns (mate = ±10000 cp)

4. **Principal Variation Lines** (`lines: PvLine[]`)
   - Multiple PV lines when using `multiPV` > 1
   - Each line contains:
     - `pv: string[]` - Sequence of moves in UCI notation
     - `eval: Evaluation` - Evaluation for that line
   - Currently extracting first move of each PV as "alternative moves"
   - Full PV lines stored in `fullPvLines` but not fully utilized

5. **Engine Statistics** (`statistics: EngineStatistics`)
   - `depth: number` - Search depth reached (half-moves/plies)
   - `selDepth?: number` - Selective search depth
   - `nodes: number` - Total positions evaluated
   - `nps: number` - Nodes per second (search speed)
   - Currently storing `depth`, `nodes`, and `time` in `PositionEvaluation`

6. **Timing** (`timingMs: number`)
   - Time taken for analysis in milliseconds
   - Currently stored in `PositionEvaluation.time`

### How We Use It (`src/services/analysis/RemoteServiceAnalysisClient.ts`)

**Position Analysis:**
- Convert evaluation to centipawns
- Extract best move (first PV line)
- Extract alternative moves (first move of other PV lines)
- Store full PV lines for potential future use
- Store depth, nodes, and timing

**Game Analysis:**
- Analyze each position before and after each move
- Calculate evaluation difference (centipawns lost)
- Classify move quality:
  - BEST: No evaluation loss
  - EXCELLENT: < 20 cp loss
  - GOOD: 20-50 cp loss
  - INACCURACY: 50-100 cp loss
  - MISTAKE: 100-300 cp loss
  - BLUNDER: ≥ 300 cp loss
- Calculate game statistics (accuracy, average evaluation, quality counts)

---

## What Else Stockfish Can Provide (Not Currently Used)

### 1. **Detailed Evaluation Breakdown** (`eval` command)
Stockfish can provide a detailed breakdown of position evaluation:
- Material balance
- Piece-square tables
- Pawn structure evaluation
- King safety
- Mobility
- Piece activity
- **Use Case**: Show users why a position is evaluated a certain way

### 2. **Position Display** (`d` command)
- ASCII art representation of the board
- FEN notation
- Current evaluation
- **Use Case**: Debugging, position verification

### 3. **Continuation Analysis** (Extended PV)
- Stockfish can provide longer PV lines (beyond what we request)
- Can analyze deeper continuations
- **Use Case**: Show longer variations, tactical sequences

### 4. **Time Management** (`movetime`, `wtime`, `btime`, `winc`, `binc`)
- We currently use `movetime` for fixed-time analysis
- Stockfish supports time controls:
  - `wtime` / `btime`: Time remaining for white/black
  - `winc` / `binc`: Increment per move
- **Use Case**: Simulate time pressure analysis, blitz game analysis

### 5. **Search Modes** (`infinite`, `ponder`, `searchmoves`)
- `infinite`: Continuous analysis until stopped
- `ponder`: Think on opponent's time
- `searchmoves`: Limit search to specific moves
- **Use Case**: 
  - Continuous analysis mode
  - Move filtering (analyze only specific candidate moves)

### 6. **Engine Options** (`setoption`)
Stockfish supports many engine options:
- `Threads`: Number of CPU threads
- `Hash`: Hash table size (memory)
- `MultiPV`: Number of principal variations (we use this)
- `Skill Level`: Reduce engine strength (0-20)
- `UCI_LimitStrength`: Limit strength to specific Elo
- `Contempt`: Adjust evaluation bias
- `Analysis Mode`: More accurate analysis
- **Use Case**: 
  - Adjust engine strength for training
  - Optimize performance
  - Fine-tune analysis quality

### 7. **Benchmarking** (`bench`)
- Performance testing
- Hardware optimization
- **Use Case**: Service performance monitoring

### 8. **Speed Test** (`speedtest`)
- Measure nodes per second on current hardware
- **Use Case**: Performance diagnostics

### 9. **Position Analysis Commands**
- `go perft <depth>`: Perft (perft = performance test) - count legal moves
- `go nodes <n>`: Search until N nodes evaluated
- `go mate <n>`: Find mate in N moves
- **Use Case**: 
  - Move generation testing
  - Mate finding puzzles
  - Specific search depth control

### 10. **Evaluation Features**
- **Contempt Factor**: Adjust evaluation to prefer draws or avoid them
- **Syzygy Tablebase**: Endgame tablebase support (perfect play in endgames)
- **Use Case**: 
  - Endgame analysis with perfect play
  - Draw evaluation adjustments

---

## Potential Enhancements We Could Add

### High Priority

1. **Full PV Line Display**
   - Currently only showing first move of alternative lines
   - Could show full variations (e.g., "1. Nf3 d5 2. d4")
   - **Implementation**: Already have `fullPvLines` data, just need UI

2. **Mate Detection**
   - Currently converting mate to ±10000 cp
   - Could show "Mate in 3" instead
   - **Implementation**: Check `evaluation.type === 'mate'` and display accordingly

3. **Evaluation Explanation**
   - Show why a position is evaluated a certain way
   - **Implementation**: Use Stockfish `eval` command for detailed breakdown

4. **Longer Variations**
   - Request deeper PV lines for critical positions
   - **Implementation**: Increase `depth` or use `movetime` for important positions

### Medium Priority

5. **Time Control Analysis**
   - Analyze positions with time pressure simulation
   - **Implementation**: Use `wtime`/`btime` parameters

6. **Engine Strength Adjustment**
   - Allow users to set engine strength for training
   - **Implementation**: Use `Skill Level` or `UCI_LimitStrength` options

7. **Continuous Analysis Mode**
   - Keep analyzing a position until stopped
   - **Implementation**: Use `infinite` search mode with stop command

8. **Move Filtering**
   - Analyze only specific candidate moves
   - **Implementation**: Use `searchmoves` parameter

### Low Priority

9. **Endgame Tablebase Integration**
   - Perfect play in endgames
   - **Implementation**: Configure Stockfish with Syzygy tablebase support

10. **Performance Monitoring**
    - Track analysis speed and quality
    - **Implementation**: Use `bench` and `speedtest` commands

11. **Contempt Factor**
    - Adjust evaluation bias
    - **Implementation**: Use `Contempt` option

---

## Current Limitations

1. **Evaluation Type**: Converting mate to centipawns loses information (can't distinguish "Mate in 1" from "Mate in 10")
2. **PV Lines**: Not fully utilizing multi-PV data (only showing first move)
3. **Evaluation Details**: No breakdown of why a position is evaluated a certain way
4. **Time Controls**: Not simulating time pressure scenarios
5. **Engine Options**: Not exposing engine configuration to users
6. **Continuous Analysis**: No "analyze until stopped" mode

---

## References

- [Stockfish UCI Documentation](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-%26-Commands.html)
- [UCI Protocol Specification](https://www.chessprogramming.org/UCI)
- Current implementation: `stockfish-service/src/engine/UciParser.ts`
- Current client: `src/services/analysis/RemoteServiceAnalysisClient.ts`



