# Chess Trainer Plugin for Obsidian

Import PGN chess games and create interactive notes with playable boards and move analysis.

## Features

- **PGN Import**: Import chess games via modal interface with real-time validation
- **Example PGN Helper**: Load example PGN with one click
- **Enhanced Error Messages**: Line-numbered validation errors for easier debugging
- **Interactive Board**: View and navigate through games with an interactive chess board
- **Move Navigation**: Previous/Next, Reset, Play/Pause, and Flip board controls
- **Accessibility**: ARIA labels and screen reader support for all controls
- **Responsive Design**: Works on desktop and mobile devices
- **Automatic Metadata**: Extract player names, Elo ratings, ECO codes, openings, and game results
- **Structured Notes**: Games are saved with consistent frontmatter and organized in `Chess/games/` folder
- **Offline-First**: All functionality works without internet connection

## Installation

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/YasafVol/chess-trainer/releases)
2. Extract the files (`main.js`, `manifest.json`, `styles.css`) to your vault's plugin folder:
   ```
   <YourVault>/.obsidian/plugins/chess-trainer/
   ```
3. Reload Obsidian
4. Enable the plugin in **Settings → Community plugins**

### Development Installation

1. Clone this repository to your vault's plugin folder:
   ```bash
   cd <YourVault>/.obsidian/plugins/
   git clone https://github.com/YasafVol/chess-trainer.git
   ```

2. Install dependencies:
   ```bash
   cd chess-trainer
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Enable the plugin in **Settings → Community plugins**

## Usage

### Importing a Game

1. **Ribbon Button**: Click the chess crown icon in the left ribbon
2. **Command**: Use `Cmd+Opt+P` (macOS) or `Ctrl+Alt+P` (Windows/Linux) - or assign your own hotkey in Settings
3. **Command Palette**: Run "Chess Trainer: Import PGN"

### In the Import Modal

1. Paste your PGN (Portable Game Notation) into the text area
2. Click "📋 Load Example PGN" to see a sample game format
3. The plugin validates the PGN in real-time with helpful error messages
4. Click "Import" when validation shows ✅
5. A success notice will appear and your game note will be created

### Viewing a Game

1. Open the created note in `Chess/games/`
2. The chess board will render automatically
3. Use the controls to navigate:
   - **‹** Previous move
   - **›** Next move
   - **↺** Reset to start
   - **▶/⏸** Play/Pause autoplay
   - **⇅** Flip board orientation

## Keyboard Shortcuts

- Default hotkey: `Cmd+Opt+P` (macOS) / `Ctrl+Alt+P` (Windows/Linux)
- You can customize this in **Settings → Hotkeys** by searching for "Import PGN"

## File Format

Games are saved as markdown notes with:

- **Location**: `Chess/games/`
- **Filename**: `YYYY-MM-DD WhitePlayer(elo)-vs-BlackPlayer(elo) result.md`
- **Frontmatter**: Includes game metadata (players, date, result, ECO, opening, tags)
- **Content**: Original PGN in a `chess-pgn` code block

## Troubleshooting

### Hotkey Not Working

The default hotkey may conflict with other plugins. You can manually assign a hotkey:
1. Go to **Settings → Hotkeys**
2. Search for "Import PGN"
3. Assign your preferred hotkey

### PGN Not Importing

- Check that the PGN is valid (contains headers and moves)
- Ensure the PGN format is correct (PGN standard)
- Check the console for detailed error messages (Open DevTools: `Cmd+Opt+I`)

### Board Not Displaying

- Ensure the plugin is enabled
- Reload Obsidian
- Check the console for errors

## Dependencies

This plugin bundles:
- **chess.js** (BSD-2-Clause) - Chess logic and PGN parsing
- **chessboard-element** (MIT) - Chess board rendering

All dependencies are bundled locally - no network access required.

## Roadmap

See `Spec/ROADMAP.md` for planned features:
- **V0**: ✅ Complete - Core PGN import and board rendering
- **V0.5**: ✅ Complete - UI/UX polish, accessibility, and QA
- **V1**: Game analysis with Stockfish engine
- **V1.5**: Puzzle generation and training mode
- **V2**: API integrations (Chess.com, Lichess)
- **V3**: Advanced database and analytics
- **V4**: Full customization settings

## Contributing

Contributions welcome! Please see the implementation plans in `Spec/V0_IMPLEMENTATION_PLAN.md` and `Spec/V0_5_IMPLEMENTATION_PLAN.md` for current priorities.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Obsidian](https://obsidian.md)
- Uses [chess.js](https://github.com/jhlywa/chess.js) for chess logic
- Uses [chessboard-element](https://github.com/lichess-org/chessboard-element) for board rendering
