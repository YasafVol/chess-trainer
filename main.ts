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
import { ChessTrainerSettings, DEFAULT_SETTINGS } from './src/types/settings';
import { ChessTrainerSettingsTab } from './src/ui/SettingsTab';
import { RemoteServiceAnalysisClient } from './src/services/analysis/RemoteServiceAnalysisClient';
import { AnalysisClient } from './src/services/analysis/AnalysisClient';
import { saveAnnotations, loadAnnotations } from './src/services/analysis/AnnotationStorage';
import { MoveQuality, MoveAnalysis, GameAnalysis } from './src/types/analysis';

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
	settings: ChessTrainerSettings;
	analysisClient: AnalysisClient | null = null;

	async onload(): Promise<void> {
		const version = '0.2.4';
		console.log(`[Chess Trainer] Loading plugin version ${version}`);
		logInfo(`Loading Chess Trainer plugin v${version}`);

		// Load settings
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Initialize analysis client if enabled
		if (this.settings.analysisEnabled) {
			this.analysisClient = new RemoteServiceAnalysisClient(this.settings.serviceUrl);
		}

		// Add settings tab
		try {
			const settingsTab = new ChessTrainerSettingsTab(this.app, this);
			this.addSettingTab(settingsTab);
			logInfo('Settings tab registered');
		} catch (error) {
			logError('Failed to register settings tab', error);
		}

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

		// Add command for manual game analysis
		this.addCommand({
			id: 'chess-analyze-game',
			name: 'Analyze current game',
			callback: async () => {
				await this.analyzeCurrentGame();
			}
		});

		// Register markdown processor for chess-pgn code blocks
		this.registerMarkdownCodeBlockProcessor('chess-pgn', async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const cleanup = await this.renderChessBoard(source, el, ctx);
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
				
				// Trigger analysis if enabled
				if (this.settings.analysisEnabled && this.analysisClient) {
					this.analyzeGameAsync(normalizedPgn, hash).catch((error) => {
						logError('Failed to analyze game', error);
					});
				}
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
	private async renderChessBoard(pgn: string, el: HTMLElement, ctx?: MarkdownPostProcessorContext): Promise<(() => void) | undefined> {
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

			// Attempt to load annotations for this game
			const frontmatter = (ctx as any)?.frontmatter ?? {};
			let gameHash: string | undefined = typeof frontmatter?.hash === 'string' ? frontmatter.hash : undefined;
			if (!gameHash && typeof frontmatter?.gameHash === 'string') {
				gameHash = frontmatter.gameHash;
			}
			if (!gameHash) {
				try {
					gameHash = await shortHash(normalizedPgn);
				} catch (hashError) {
					logError('Failed to compute game hash for annotations', hashError);
				}
			}
			let analysis: GameAnalysis | null = null;
			const annotationsByPly = new Map<number, MoveAnalysis>();
			if (gameHash) {
				analysis = await loadAnnotations(this.app.vault, gameHash);
				if (analysis?.moves) {
					for (const move of analysis.moves) {
						if (typeof move?.ply === 'number' && move.playedMove) {
							annotationsByPly.set(move.ply, move);
						}
					}
				}
			}

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
			container.style.cssText = 'position: relative; width: 100%;';
			el.appendChild(container);

			// Create board element
			const boardSizeSetting = this.settings?.boardSizePx ?? DEFAULT_SETTINGS.boardSizePx;
			const boardEl = document.createElement('chess-board') as any;
			boardEl.setAttribute('show-notation', 'true');
			if (boardSizeSetting && boardSizeSetting > 0) {
				boardEl.style.width = `${boardSizeSetting}px`;
				boardEl.style.height = `${boardSizeSetting}px`;
				boardEl.style.maxWidth = '100%';
				boardEl.style.maxHeight = '100%';
			} else {
				boardEl.style.width = '100%';
				boardEl.style.height = 'auto';
				boardEl.style.maxWidth = '100%';
				boardEl.style.maxHeight = '100%';
			}
			boardEl.style.aspectRatio = '1 / 1';
			boardEl.style.display = 'block';
			boardEl.style.margin = '0 auto';
			container.appendChild(boardEl);

			// Create controls container
			const controlsEl = document.createElement('div');
			controlsEl.className = 'chess-controls';
			controlsEl.setAttribute('role', 'toolbar');
			controlsEl.setAttribute('aria-label', 'Chess board controls');
			controlsEl.style.cssText = 'margin: 10px 0; display: flex; gap: 5px; flex-wrap: wrap;';
			container.appendChild(controlsEl);

			// Analysis summary (if available)
			let analysisSummaryEl: HTMLDivElement | null = null;
			if (analysis) {
				analysisSummaryEl = document.createElement('div');
				analysisSummaryEl.className = 'analysis-summary';
				analysisSummaryEl.innerHTML = `
					<span title="Engine depth">Depth <strong>${analysis.depth}</strong></span>
					<span title="Accuracy">Accuracy <strong>${analysis.statistics.accuracy.toFixed(1)}%</strong></span>
					<span title="Analysis duration">Time <strong>${(analysis.analysisTime / 1000).toFixed(1)}s</strong></span>
				`;
				container.appendChild(analysisSummaryEl);
			} else if (gameHash) {
				analysisSummaryEl = document.createElement('div');
				analysisSummaryEl.className = 'analysis-summary missing';
				analysisSummaryEl.textContent = 'Analysis data not found for this game.';
				container.appendChild(analysisSummaryEl);
			}

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
			movesEl.style.cssText = 'margin-top: 10px; font-family: monospace; line-height: 1.4; width: 100%; overflow-y: auto;';
			container.appendChild(movesEl);

			// State
			let currentPly = 0;
			let autoplayTimer: number | null = null;
			let isPlaying = false;
			let flipped = false;
			const autoplayAllowed = totalPlies <= 500;
			let playBtn: HTMLButtonElement | null = null;

			const QUALITY_SYMBOLS: Record<MoveQuality, string> = {
				[MoveQuality.BEST]: '✓',
				[MoveQuality.EXCELLENT]: '!!',
				[MoveQuality.GOOD]: '!',
				[MoveQuality.INACCURACY]: '?!',
				[MoveQuality.MISTAKE]: '?',
				[MoveQuality.BLUNDER]: '??'
			};

			const QUALITY_LABELS: Record<MoveQuality, string> = {
				[MoveQuality.BEST]: 'Best move',
				[MoveQuality.EXCELLENT]: 'Excellent move',
				[MoveQuality.GOOD]: 'Good move',
				[MoveQuality.INACCURACY]: 'Inaccuracy',
				[MoveQuality.MISTAKE]: 'Mistake',
				[MoveQuality.BLUNDER]: 'Blunder'
			};

			const moveElements: Array<HTMLSpanElement | undefined> = [];

			const buildAnnotationTooltip = (annotation: MoveAnalysis): string => {
				const parts = [QUALITY_LABELS[annotation.quality]];
				if (annotation.bestMove) {
					parts.push(`Best: ${annotation.bestMove}`);
				}
				parts.push(`Δ ${annotation.evaluationDiff} cp`);
				return parts.join(' • ');
			};

			const buildMovesList = () => {
				movesEl.textContent = '';
				const fragment = document.createDocumentFragment();

				history.forEach((move: any, index: number) => {
					const moveNumber = Math.floor(index / 2) + 1;
					const isWhiteMove = index % 2 === 0;

					if (isWhiteMove) {
						const numberSpan = document.createElement('span');
						numberSpan.className = 'move-number';
						numberSpan.textContent = `${moveNumber}. `;
						fragment.appendChild(numberSpan);
					}

					const moveSpan = document.createElement('span');
					moveSpan.className = 'chess-move';
					moveSpan.textContent = move.san;
					moveSpan.dataset.ply = String(index);

					const annotation = annotationsByPly.get(index);
					if (annotation) {
						moveSpan.classList.add('has-annotation', `quality-${annotation.quality}`);
						const symbol = QUALITY_SYMBOLS[annotation.quality];
						if (symbol) {
							const symbolSpan = document.createElement('span');
							symbolSpan.className = 'move-annotation-symbol';
							symbolSpan.textContent = symbol;
							moveSpan.appendChild(document.createTextNode(' '));
							moveSpan.appendChild(symbolSpan);
						}
						moveSpan.setAttribute('title', buildAnnotationTooltip(annotation));
					}

					moveSpan.addEventListener('click', () => {
						currentPly = index + 1;
						isPlaying = false;
						if (autoplayTimer) {
							clearInterval(autoplayTimer);
							autoplayTimer = null;
						}
						if (playBtn) {
							playBtn.textContent = '▶';
						}
						render();
					});

					moveElements[index] = moveSpan;
					fragment.appendChild(moveSpan);
					fragment.appendChild(document.createTextNode(' '));
				});

				movesEl.appendChild(fragment);
			};

			buildMovesList();

			const ensureMoveVisible = (target: HTMLSpanElement) => {
				const parent = movesEl;
				const top = target.offsetTop;
				const bottom = top + target.offsetHeight;
				const viewTop = parent.scrollTop;
				const viewBottom = viewTop + parent.clientHeight;
				if (top < viewTop) {
					parent.scrollTop = top;
				} else if (bottom > viewBottom) {
					parent.scrollTop = bottom - parent.clientHeight;
				}
			};

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

				// Update moves list highlighting
				let currentMoveElement: HTMLSpanElement | null = null;
				moveElements.forEach((moveEl, index) => {
					if (!moveEl) return;
					if (index === currentPly - 1) {
						moveEl.classList.add('current');
						currentMoveElement = moveEl;
					} else {
						moveEl.classList.remove('current');
					}
				});
				if (currentMoveElement) {
					ensureMoveVisible(currentMoveElement);
				}
				
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
				movesEl.scrollTop = 0;
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
			this.createButton(controlsEl, '‹', 'Previous move', () => navigateMove(-1));
			this.createButton(controlsEl, '›', 'Next move', () => navigateMove(1));
			this.createButton(controlsEl, '↺', 'Reset to start', resetPosition);
			playBtn = this.createButton(controlsEl, '▶', autoplayAllowed ? 'Play/Pause' : 'Autoplay disabled (too many moves)', toggleAutoplay);
			this.createButton(controlsEl, '⇅', 'Flip board', flipBoard);

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

	/**
	 * Save settings
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		
		// Update analysis client if URL changed
		if (this.settings.analysisEnabled) {
			this.analysisClient = new RemoteServiceAnalysisClient(this.settings.serviceUrl);
		} else {
			this.analysisClient = null;
		}
	}

	/**
	 * Analyze game asynchronously (background)
	 */
	private async analyzeGameAsync(pgn: string, gameHash: string): Promise<void> {
		if (!this.analysisClient) {
			return;
		}

		try {
			// Check if service is available
			const isAvailable = await this.analysisClient.ping();
			if (!isAvailable) {
				new Notice('Stockfish companion service not reachable. Start the service or update the URL in settings.');
				return;
			}

			new Notice('Analyzing game with Stockfish...');

			// Parse PGN to get moves
			const normalizedPgn = normalizePgnInput(pgn);
			const game = new Chess();
			game.loadPgn(normalizedPgn, { strict: false });
			const history = game.history({ verbose: true });
			
			// Convert to UCI moves
			const uciMoves = history.map((move: any) => {
				const from = move.from;
				const to = move.to;
				const promotion = move.promotion || '';
				return from + to + promotion;
			});

			// Perform analysis
			const analysis = await this.analysisClient.analyzeGame(
				'startpos',
				uciMoves,
				{
					depth: this.settings.defaultDepth,
					multiPV: this.settings.defaultMultiPV,
					movetimeMs: this.settings.defaultMovetimeMs,
				}
			);

			// Set game hash
			analysis.gameHash = gameHash;

			// Save annotations
			await saveAnnotations(this.app.vault, gameHash, analysis);

			new Notice(`✅ Game analysis complete! Analyzed ${analysis.moves.length} moves.`);
			logInfo(`Analysis complete for game ${gameHash}: ${analysis.statistics.accuracy.toFixed(1)}% accuracy`);
		} catch (error) {
			logError('Game analysis failed', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			new Notice(`❌ Analysis failed: ${errorMessage}`);
		}
	}

	/**
	 * Analyze current game (manual command)
	 */
	private async analyzeCurrentGame(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No file open. Open a chess game note to analyze.');
			return;
		}

		// Read file content
		const content = await this.app.vault.read(activeFile);
		
		// Extract PGN from chess-pgn code block
		const pgnMatch = content.match(/```chess-pgn\n([\s\S]*?)\n```/);
		if (!pgnMatch) {
			new Notice('No chess game found in current file. Ensure the file contains a ```chess-pgn``` code block.');
			return;
		}

		const pgn = pgnMatch[1];
		const hash = await shortHash(normalizePgnInput(pgn));

		await this.analyzeGameAsync(pgn, hash);
	}

}
