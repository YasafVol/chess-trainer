/**
 * Chess Trainer Plugin for Obsidian
 * Imports PGN chess games and creates interactive notes with playable boards
 */

import { App, Plugin } from 'obsidian';
import { sha1, shortHash } from './src/util/sha1';
import { generateChessFilename, normalizeDate } from './src/util/filename';
import { logInfo, logError, logDebug } from './src/util/logger';
import { ImportModal } from './src/ui/ImportModal';
import { validatePgn, extractHeaders } from './src/services/pgnValidator';
import { upsert } from './src/adapters/NoteRepo';

// Import vendored dependencies
// @ts-ignore - Bundled dependency
import './src/deps/chessboard-element.js';

// Import chess.js for PGN parsing
// @ts-ignore - Bundled dependency
import { Chess } from './src/deps/chess.js.mjs';

export default class ChessTrainer extends Plugin {
	constructor(app: App) {
		super(app);
	}

	async onload(): Promise<void> {
		logInfo('Loading Chess Trainer plugin v0.2.0');

		// Add ribbon icon
		this.addRibbonIcon('dice', 'Chess Trainer', (evt: MouseEvent) => {
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
					modifiers: ['Ctrl', 'Alt'],
					key: 'p'
				}
			]
		});

		// Register markdown processor for chess-pgn code blocks
		this.registerMarkdownCodeBlockProcessor('chess-pgn', async (source: string, el: any) => {
			await this.renderChessBoard(source, el);
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
				logError(`Invalid PGN provided: ${validationResult.error?.message}`);
				return;
			}

			if (validationResult.warnings && validationResult.warnings.length > 0) {
				logDebug(`PGN warnings: ${validationResult.warnings.join(', ')}`);
			}

			// Parse PGN headers
			const headers = extractHeaders(pgn);
			
			// Generate hash for filename
			const hash = await shortHash(pgn);
			
			// Generate filename
			const filename = generateChessFilename(headers, hash);
			
			// Create note content
			const noteContent = await this.generateNoteContent(pgn, headers, hash);
			
			// Save note to vault
			const result = await upsert(this.app.vault, `Chess/games/${filename}`, noteContent);
			
			if (result.created) {
				logInfo(`Created new chess note: ${result.path}`);
			} else {
				logInfo(`Updated existing chess note: ${result.path}`);
			}

		} catch (error) {
			logError('Failed to process PGN import', error);
		}
	}

	/**
	 * Generate markdown content for chess note
	 */
	private async generateNoteContent(pgn: string, headers: any, hash: string): Promise<string> {
		const created = new Date().toISOString();
		const white = headers.White || 'White';
		const black = headers.Black || 'Black';
		const whiteElo = parseInt(headers.WhiteElo || headers.WhiteRating || '') || null;
		const blackElo = parseInt(headers.BlackElo || headers.BlackRating || '') || null;
		const result = headers.Result || '*';
		const date = normalizeDate(headers.Date);

		// Build frontmatter
		const frontmatter = {
			source: 'manual',
			created,
			event: headers.Event || '',
			site: headers.Site || '',
			date: headers.Date || '',
			white,
			white_elo: whiteElo,
			black,
			black_elo: blackElo,
			result,
			time_control: headers.TimeControl || '',
			eco: headers.ECO || '',
			opening: headers.Opening || '',
			hash
		};

		// Generate frontmatter string
		const frontmatterString = Object.entries(frontmatter)
			.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
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
	private async renderChessBoard(pgn: string, el: HTMLElement): Promise<void> {
		try {
			logDebug(`Rendering chess board for PGN (${pgn.length} characters)`);

			// Initialize game state
			const game = new Chess();
			try {
				game.loadPgn(pgn);
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
			tempGame.loadPgn(pgn);
			fenPositions.push(tempGame.fen()); // Starting position

			for (let i = 0; i < history.length; i++) {
				tempGame.move(history[i]);
				fenPositions.push(tempGame.fen());
			}

			// Create container
			const container = document.createElement('div');
			container.className = 'chess-pgn-viewer';
			el.appendChild(container);

			// Create board element
			const boardEl = document.createElement('chess-board') as any;
			boardEl.setAttribute('show-notation', 'true');
			boardEl.style.width = '360px';
			boardEl.style.maxWidth = '100%';
			boardEl.style.height = '360px';
			container.appendChild(boardEl);

			// Create controls container
			const controlsEl = document.createElement('div');
			controlsEl.className = 'chess-controls';
			controlsEl.style.cssText = 'margin: 10px 0; display: flex; gap: 5px; flex-wrap: wrap;';
			container.appendChild(controlsEl);

			// Create moves list container
			const movesEl = document.createElement('div');
			movesEl.className = 'chess-moves';
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
				if (flipped) {
					boardEl.setAttribute('orientation', (currentPly % 2 === 0) ? 'black' : 'white');
				} else {
					boardEl.removeAttribute('orientation');
				}

				// Update moves list with current move highlighting
				const movesText = history.map((move: any, index: number) => {
					const moveNumber = Math.floor(index / 2) + 1;
					const isWhite = index % 2 === 0;
					
					if (index === currentPly) {
						return `[${move.san}]`;
					}
					
					return isWhite ? `${moveNumber}. ${move.san}` : `${move.san}`;
				}).join(' ');
				
				movesEl.textContent = movesText;
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

			// Store cleanup function
			(el as any)._chessCleanup = cleanup;

		} catch (error) {
			logError('Failed to render chess board', error);
			el.appendChild(document.createTextNode('Failed to render chess board'));
		}
	}

	/**
	 * Create a control button
	 */
	private createButton(container: HTMLElement, text: string, title: string, onClick: () => void): HTMLButtonElement {
		const button = document.createElement('button');
		button.textContent = text;
		button.title = title;
		button.addEventListener('click', onClick);
		container.appendChild(button);
		return button;
	}

}
