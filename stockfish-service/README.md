# Stockfish Companion Service

HTTP API wrapper for Stockfish chess engine analysis. This service runs Stockfish locally and provides a REST API for chess position analysis.

## Prerequisites

- **Node.js** 18+ installed
- **Stockfish binary** installed and available in PATH (or specify path via `STOCKFISH_PATH`)

### Installing Stockfish

#### macOS
```bash
brew install stockfish
```

#### Linux
```bash
sudo apt-get install stockfish
# or
sudo pacman -S stockfish
```

#### Windows
Download from [Stockfish official site](https://stockfishchess.org/download/) and add to PATH, or install via:
```bash
choco install stockfish
```

#### Verify Installation
```bash
stockfish
# Should show Stockfish version and UCI prompt
```

## Installation

```bash
cd stockfish-service
npm install
```

## Usage

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

- `PORT` - Server port (default: `9898`)
- `STOCKFISH_PATH` - Path to Stockfish executable (default: `stockfish`)
- `ENGINE_THREADS` - Number of threads for Stockfish (default: `1`)
- `ENGINE_HASH` - Hash table size in MB (default: `128`)

Example:
```bash
PORT=8080 STOCKFISH_PATH=/usr/local/bin/stockfish npm start
```

## API Endpoints

### GET /health

Check service health and engine status.

**Response:**
```json
{
  "status": "healthy",
  "engine": "ready",
  "version": "Stockfish 16"
}
```

### POST /analyze

Analyze a chess position.

**Request:**
```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "moves": ["e2e4", "e7e5"],
  "depth": 14,
  "multiPV": 1,
  "movetimeMs": 0
}
```

**Parameters:**
- `fen` (optional): Starting FEN position (defaults to startpos)
- `moves` (optional): Array of UCI moves to play from starting position
- `depth` (optional): Analysis depth 1-30 (default: `14`)
- `multiPV` (optional): Number of principal variations 1-10 (default: `1`)
- `movetimeMs` (optional): Time limit in milliseconds (default: `0` = use depth)

**Response:**
```json
{
  "bestMove": "e2e4",
  "ponder": "e7e5",
  "evaluation": {
    "type": "cp",
    "value": 23
  },
  "lines": [
    {
      "pv": ["e2e4", "e7e5", "Nf3"],
      "eval": {
        "type": "cp",
        "value": 23
      }
    }
  ],
  "statistics": {
    "depth": 14,
    "selDepth": 22,
    "nodes": 123456,
    "nps": 500000
  },
  "timingMs": 512
}
```

## Error Responses

### Validation Error (400)
```json
{
  "error": "validation_error",
  "message": "depth: Expected number, received string"
}
```

### Timeout (504)
```json
{
  "error": "timeout",
  "message": "Analysis exceeded time limit (depth=14)."
}
```

### Analysis Error (500)
```json
{
  "error": "analysis_error",
  "message": "Stockfish process not initialized"
}
```

## Testing

Test the service locally:

```bash
# Health check
curl http://localhost:9898/health

# Analyze starting position
curl -X POST http://localhost:9898/analyze \
  -H "Content-Type: application/json" \
  -d '{"depth": 10}'
```

## Troubleshooting

### Stockfish binary not found

Ensure Stockfish is installed and in your PATH:
```bash
which stockfish
```

Or set `STOCKFISH_PATH` environment variable:
```bash
STOCKFISH_PATH=/path/to/stockfish npm start
```

### Engine initialization fails

- Check that Stockfish binary is executable
- Verify Stockfish version (tested with Stockfish 16)
- Check console logs for detailed error messages

### Analysis timeout

- Reduce `depth` parameter (default is 14)
- Set `movetimeMs` to limit analysis time
- Increase `ENGINE_THREADS` for faster analysis (if CPU allows)

## License

MIT


