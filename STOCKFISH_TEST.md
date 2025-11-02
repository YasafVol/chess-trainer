# Stockfish Engine Integration Test

## Testing the Integration

1. **Build the plugin**:
   ```bash
   npm run build
   ```

2. **Ensure WASM files are present**:
   The Stockfish files should be in the plugin root directory:
   - `stockfish.wasm.js` (Worker file)
   - `stockfish.wasm` (WASM binary)
   
   These are automatically copied during setup. If missing, run:
   ```bash
   cp node_modules/stockfish.js/stockfish.wasm.js .
   cp node_modules/stockfish.js/stockfish.wasm .
   ```

3. **Reload Obsidian** plugin

4. **Run the test**:
   - Open Command Palette (`Cmd+P` / `Ctrl+P`)
   - Type "Test Stockfish Engine"
   - Select the command
   - Check the console for detailed test results

## Expected Test Results

The test will:
1. Initialize the Stockfish engine
2. Set the starting position
3. Analyze with depth 5 (should take a few seconds)
4. Show evaluation, best move, and depth reached
5. Test a second position (after e4 e5)
6. Clean up and terminate

## Troubleshooting

### Worker Creation Error
**Error**: "Failed to construct 'Worker': The V8 platform used by this instance of Node does not support creating Workers"

**Solution**: Obsidian's Electron environment may not support Workers. Options:
1. Use an absolute path to the worker file
2. Use a blob URL approach
3. Consider alternative chess engine that doesn't require Workers

### WASM files not loading
- Ensure `stockfish.wasm.js` and `stockfish.wasm` are in the plugin root directory
- Check browser console for loading errors
- Verify file paths are correct
- In Electron, relative paths might not work - may need absolute paths

### Engine initialization fails
- Check console for detailed error messages
- Verify WASM support in browser (should work in Obsidian/Electron)
- Check if SharedArrayBuffer is available (may need COOP/COEP headers in some environments)

### Analysis timeout
- Default timeout is 60 seconds
- For depth 5, should complete in 1-5 seconds typically
- If timing out, check if engine is actually running

## Notes

- The engine uses Web Workers for non-blocking execution
- Stockfish.js requires Workers to function
- In Obsidian/Electron, Workers might need special handling
- Bundle size: ~123 KB (was ~118 KB before Stockfish)

## Alternative Approaches

If Workers don't work in Obsidian:
1. Use a non-Worker chess engine (e.g., a pure JavaScript implementation)
2. Use a different analysis approach (cloud-based API)
3. Wait for Obsidian to support Workers in plugin context


