/**
 * Chess Trainer Plugin for Obsidian
 * Imports PGN chess games and creates interactive notes with playable boards
 */

import { App, MarkdownPostProcessorContext, Notice, Plugin } from 'obsidian';
import { sha1, shortHash } from './src/util/sha1';
import { generateChessFilename, normalizeDate } from './src/util/filename';
import { logInfo, logError, logDebug } from './src/util/logger';
import { ImportModal } from './src/ui/ImportModal';
import { validatePgn, extractHeaders } from './src/services/pgnValidator';
import { upsert } from './src/adapters/NoteRepo';
import { lookupOpeningFromECO } from './src/util/eco';
import { normalizePgnInput } from './src/util/pgn';
import { testStockfishEngine } from './src/services/engine/testStockfish';

// Import chess.js for PGN parsing
// @ts-ignore - Bundled dependency
import { Chess } from './src/deps/chess.js.mjs';

let chessBoardReady = false;

async function ensureChessBoardElement() {
	if (chessBoardReady) {
		return;
	}
	if (typeof customElements !== 'undefined' && customElements.get('chess-board')) {
		chessBoardReady = true;
		return;
	}
	await import('./src/deps/chessboard-element.js');
	chessBoardReady = true;
}

export default class ChessTrainer extends Plugin {
	async onload(): Promise<void> {
		logInfo('Loading Chess Trainer plugin v0.2.0');

		await ensureChessBoardElement();

		// Add ribbon icon
		this.addRibbonIcon('crown', 'Chess Trainer', (_evt: MouseEvent) => {
			this.openImportModal();
		});

		// Add command
		this.addCommand({
			id: 'chess-import-pgn',
			name: 'Import PGN',
			callback: () => {
				this.openImportModal();
			},
			hotkeys: [
				{
					modifiers: ['Mod', 'Alt'],
					key: 'p'
				}
			]
		});

		// Add test command for Stockfish engine (development only)
		this.addCommand({
			id: 'chess-test-stockfish',
			name: 'Test Stockfish Engine',
			callback: async () => {
				new Notice('🧪 Testing Stockfish engine... Check console for results');
				try {
					await testStockfishEngine();
					new Notice('✅ Stockfish engine test completed! Check console for details.');
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					logError('Stockfish test failed', error);
					new Notice(`❌ Stockfish test failed: ${errorMessage}`);
				}
			}
		});

		// Register markdown processor for chess-pgn code blocks
		this.registerMarkdownCodeBlockProcessor('chess-pgn', async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const cleanup = await this.renderChessBoard(source, el);
			if (typeof cleanup === 'function' && typeof ctx.addCleanup === 'function') {
				ctx.addCleanup(cleanup);
			}
		});

		logInfo('Chess Trainer plugin loaded successfully');
	}

	onunload(): void {
		logInfo('Chess Trainer plugin unloaded');
	}

	/**
	 * Open PGN import modal
	 */
	private openImportModal(): void {
		logInfo('Opening PGN import modal');
		const modal = new ImportModal(this.app, async (pgn: string) => {
			await this.processPgnImport(pgn);
		}) as any;
		modal.open();
	}

	/**
	 * Process imported PGN and create chess note
	 */
	private async processPgnImport(pgn: string): Promise<void> {
		try {
			logInfo(`Processing PGN import (${pgn.length} characters)`);

			// Validate PGN
			const validationResult = validatePgn(pgn);
			if (!validationResult.isValid) {
				const errorMessage = validationResult.error?.message || 'Invalid PGN format';
				logError(`Invalid PGN provided: ${errorMessage}`);
				new Notice(`❌ Invalid PGN: ${errorMessage}`);
				return;
			}

			if (validationResult.warnings && validationResult.warnings.length > 0) {
				logDebug(`PGN warnings: ${validationResult.warnings.join(', ')}`);
			}

			const normalizedPgn = validationResult.normalized ?? normalizePgnInput(pgn);

			// Parse PGN headers
			const headers = extractHeaders(normalizedPgn);
			
			// Generate hash for filename
			const hash = await shortHash(normalizedPgn);
			
			// Generate filename
			const filename = generateChessFilename(headers, hash);
			
			// Create note content
			const noteContent = await this.generateNoteContent(pgn.trim(), headers, hash);
			
			// Save note to vault
			const result = await upsert(this.app.vault, `Chess/games/${filename}`, noteContent);
			
			if (result.created) {
				logInfo(`Created new chess note: ${result.path}`);
				new Notice(`✅ Created chess note: ${filename}`);
			} else {
				logInfo(`Updated existing chess note: ${result.path}`);
				new Notice(`📝 Updated chess note: ${filename}`);
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logError('Failed to process PGN import', error);
			new Notice(`❌ Failed to create note: ${errorMessage}`);
		}
	}

	/**
	 * Generate markdown content for chess note
	 */
	private async generateNoteContent(pgn: string, headers: any, hash: string): Promise<string> {
		const created = new Date().toISOString().split('T')[0]; // Just date: YYYY-MM-DD
		const white = headers.White || 'White';
		const black = headers.Black || 'Black';
		const whiteElo = parseInt(headers.WhiteElo || headers.WhiteRating || '') || null;
		const blackElo = parseInt(headers.BlackElo || headers.BlackRating || '') || null;
		const result = headers.Result || '*';
		const date = normalizeDate(headers.Date);
		
		// Lookup opening from ECO if Opening header is missing
		const eco = headers.ECO || '';
		const opening = headers.Opening || (eco ? lookupOpeningFromECO(eco) : '');

		// Build frontmatter
		const frontmatter = {
			source: 'manual',
			created,
			event: headers.Event || '',
			site: headers.Site || '',
			date: headers.Date || '', // PGN Date header (format: YYYY.MM.DD)
			white,
			white_elo: whiteElo,
			black,
			black_elo: blackElo,
			result,
			time_control: headers.TimeControl || '',
			eco,
			opening,
			hash,
			tags: ['chess', 'game_analysis']
		};

		// Generate frontmatter string
		const frontmatterString = Object.entries(frontmatter)
			.map(([key, value]) => {
				// Handle array values (tags) - format as YAML array
				if (Array.isArray(value)) {
					return `${key}:\n${value.map(item => `  - ${JSON.stringify(item)}`).join('\n')}`;
				}
				return `${key}: ${JSON.stringify(value)}`;
			})
			.join('\n');

		// Build complete note content
		const content = [
			'---',
			frontmatterString,
			'---',
			'',
			'```chess-pgn',
			pgn.trim(),
			'```'
		].join('\n');

		return content;
	}

	/**
	 * Render chess board for PGN code block
	 */
	private async renderChessBoard(pgn: string, el: HTMLElement): Promise<(() => void) | undefined> {
		try {
			logDebug(`Rendering chess board for PGN (${pgn.length} characters)`);

			// Initialize game state
			const normalizedPgn = normalizePgnInput(pgn);
			const game = new Chess();
			try {
				game.loadPgn(normalizedPgn, { strict: false });
			} catch (error) {
				el.appendChild(document.createTextNode('Failed to load PGN'));
				return;
			}

			const history = game.history({ verbose: true });
			const totalPlies = history.length;

			// Guard against very long games
			if (totalPlies > 500) {
				const warning = document.createElement('div');
				warning.className = 'chess-warning';
				warning.textContent = `Game has ${totalPlies} moves. Autoplay disabled for performance.`;
				warning.style.cssText = 'color: orange; margin-bottom: 10px; font-style: italic;';
				el.appendChild(warning);
			}

			// Precompute FEN positions for performance
			const fenPositions: string[] = [];
			const tempGame = new Chess();
			fenPositions.push(tempGame.fen()); // Starting position
			for (const move of history) {
				tempGame.move(move);
				fenPositions.push(tempGame.fen());
			}

			// Create container
			const container = document.createElement('div');
			container.className = 'chess-pgn-viewer';
			container.style.cssText = 'position: relative;';
			el.appendChild(container);

			// Create board element
			const boardEl = document.createElement('chess-board') as any;
			boardEl.setAttribute('show-notation', 'true');
			boardEl.style.width = '720px';
			boardEl.style.maxWidth = '100%';
			boardEl.style.height = '720px';
			boardEl.style.minWidth = '300px';
			boardEl.style.aspectRatio = '1 / 1';
			container.appendChild(boardEl);

			// Create controls container
			const controlsEl = document.createElement('div');
			controlsEl.className = 'chess-controls';
			controlsEl.setAttribute('role', 'toolbar');
			controlsEl.setAttribute('aria-label', 'Chess board controls');
			controlsEl.style.cssText = 'margin: 10px 0; display: flex; gap: 5px; flex-wrap: wrap;';
			container.appendChild(controlsEl);

			// Create aria-live region for current move announcements
			const liveRegion = document.createElement('div');
			liveRegion.setAttribute('role', 'status');
			liveRegion.setAttribute('aria-live', 'polite');
			liveRegion.setAttribute('aria-atomic', 'true');
			liveRegion.className = 'sr-only';
			liveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;';
			container.appendChild(liveRegion);

			// Create moves list container
			const movesEl = document.createElement('div');
			movesEl.className = 'chess-moves';
			movesEl.setAttribute('role', 'region');
			movesEl.setAttribute('aria-label', 'Game moves');
			movesEl.style.cssText = 'margin-top: 10px; font-family: monospace; line-height: 1.4; max-height: 200px; overflow-y: auto;';
			container.appendChild(movesEl);

			// State
			let currentPly = 0;
			let autoplayTimer: number | null = null;
			let isPlaying = false;
			let flipped = false;
			const autoplayAllowed = totalPlies <= 500;

			// Render functions
			const render = () => {
				// Set board position using precomputed FEN
				boardEl.setPosition(fenPositions[currentPly], true);
				
				// Update board orientation
				// When flipped, keep orientation fixed to 'black' (don't toggle based on move)
				if (flipped) {
					boardEl.setAttribute('orientation', 'black');
				} else {
					boardEl.removeAttribute('orientation');
				}

				// Update moves list with current move highlighting
				const movesText = history.map((move: any, index: number) => {
					const moveNumber = Math.floor(index / 2) + 1;
					const isWhite = index % 2 === 0;
					
					if (index === currentPly - 1) {
						return `[${move.san}]`;
					}
					
					return isWhite ? `${moveNumber}. ${move.san}` : `${move.san}`;
				}).join(' ');
				
				movesEl.textContent = movesText;
				
				// Announce current move for screen readers
				if (currentPly > 0 && currentPly <= history.length) {
					const currentMove = history[currentPly - 1];
					if (typeof currentMove === 'object' && currentMove.san) {
						const moveNumber = Math.floor((currentPly - 1) / 2) + 1;
						const isWhite = (currentPly - 1) % 2 === 0;
						const moveLabel = isWhite ? `Move ${moveNumber}, white plays ${currentMove.san}` : `Move ${moveNumber}, black plays ${currentMove.san}`;
						liveRegion.textContent = moveLabel;
					} else {
						liveRegion.textContent = `Move ${currentPly}`;
					}
				} else {
					liveRegion.textContent = 'Starting position';
				}
			};

			// Control functions
			const navigateMove = (direction: number) => {
				currentPly = Math.max(0, Math.min(totalPlies, currentPly + direction));
				render();
			};

			const resetPosition = () => {
				currentPly = 0;
				isPlaying = false;
				if (autoplayTimer) {
					clearInterval(autoplayTimer);
					autoplayTimer = null;
				}
				if (playBtn) playBtn.textContent = '▶';
				render();
			};

			const toggleAutoplay = () => {
				if (!autoplayAllowed) {
					logError('Autoplay disabled for games with >500 moves');
					return;
				}

				if (isPlaying) {
					// Pause
					isPlaying = false;
					if (autoplayTimer) {
						clearInterval(autoplayTimer);
						autoplayTimer = null;
					}
					if (playBtn) playBtn.textContent = '▶';
				} else {
					// Play
					isPlaying = true;
					if (playBtn) playBtn.textContent = '⏸';
					autoplayTimer = window.setInterval(() => {
						if (currentPly >= totalPlies - 1) {
							toggleAutoplay(); // Stop at end
						} else {
							navigateMove(1);
						}
					}, 500);
					
					// Register timer for cleanup
					this.registerInterval(autoplayTimer);
				}
			};

			const flipBoard = () => {
				flipped = !flipped;
				render();
			};

			// Control buttons
			const prevBtn = this.createButton(controlsEl, '‹', 'Previous move', () => navigateMove(-1));
			const nextBtn = this.createButton(controlsEl, '›', 'Next move', () => navigateMove(1));
			const resetBtn = this.createButton(controlsEl, '↺', 'Reset to start', resetPosition);
			const playBtn = this.createButton(controlsEl, '▶', autoplayAllowed ? 'Play/Pause' : 'Autoplay disabled (too many moves)', toggleAutoplay);
			const flipBtn = this.createButton(controlsEl, '⇅', 'Flip board', flipBoard);

			// Add ARIA label to board element
			boardEl.setAttribute('aria-label', 'Chess board');
			boardEl.setAttribute('role', 'img');

			// Disable autoplay button if not allowed
			if (!autoplayAllowed) {
				playBtn.disabled = true;
				playBtn.style.opacity = '0.5';
			}

			// Initial render
			render();

			// Register cleanup handler for when element is removed
			const cleanup = () => {
				if (autoplayTimer) {
					clearInterval(autoplayTimer);
					autoplayTimer = null;
				}
			};

			return cleanup;

		} catch (error) {
			logError('Failed to render chess board', error);
			el.appendChild(document.createTextNode('Failed to render chess board'));
			return;
		}
	}

	/**
	 * Create a control button
	 */
	private createButton(container: HTMLElement, text: string, title: string, onClick: () => void): HTMLButtonElement {
		const button = document.createElement('button');
		button.textContent = text;
		// Use aria-label instead of title to avoid duplicate tooltips
		// aria-label provides both accessibility and tooltip functionality
		button.setAttribute('aria-label', title);
		button.addEventListener('click', onClick);
		container.appendChild(button);
		return button;
	}

}
