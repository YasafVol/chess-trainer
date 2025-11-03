# Quick Start Guide

## Running the Stockfish Companion Service

The companion service is now located in the `stockfish-service/` directory within your plugin folder.

### Start the Service

```bash
cd stockfish-service
npm install    # First time only
npm start
```

The service will start on `http://localhost:9898` and automatically find Stockfish (already installed).

### Configure Plugin

1. Open Obsidian Settings → Chess Trainer
2. Enable "Enable analysis"
3. Service URL should be: `http://localhost:9898` (default)
4. Set your preferred depth (10-14 recommended for testing)

### Test It

1. Start the service (`npm start` in `stockfish-service/` directory)
2. Import a game in Obsidian
3. Analysis should run automatically!

See `stockfish-service/README.md` for full documentation.


