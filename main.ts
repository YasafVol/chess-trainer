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
import { PromotionModal, PromotionPiece } from './src/ui/PromotionModal';

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
		const version = '0.2.6';
		console.log(`[Chess Trainer] Loading plugin version ${version}`);
		logInfo(`Loading Chess Trainer plugin v${version}`);

		// Load settings with backward compatibility
		const loadedData = await this.loadData() || {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		// Ensure nested objects are properly merged
		if (!this.settings.showEvalBreakdown) {
			this.settings.showEvalBreakdown = DEFAULT_SETTINGS.showEvalBreakdown;
		} else {
			this.settings.showEvalBreakdown = Object.assign({}, DEFAULT_SETTINGS.showEvalBreakdown, this.settings.showEvalBreakdown);
		}

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

			const interactiveGame = new Chess();
			try {
				interactiveGame.load(fenPositions[0]);
			} catch (error) {
				logError('Failed to initialize interactive board state from FEN', {
					fen: fenPositions[0],
					error
				});
				interactiveGame.reset();
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
			boardEl.setAttribute('draggable-pieces', 'true');
			boardEl.setAttribute('drop-off-board', 'snapback');
			boardEl.setAttribute('animation-duration', '200');
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
			const moveWindowHeight = this.settings?.moveWindowHeightPx ?? DEFAULT_SETTINGS.moveWindowHeightPx;
			movesEl.style.cssText = `margin-top: 10px; font-family: monospace; line-height: 1.4; width: 100%; overflow-y: auto; max-height: ${moveWindowHeight}px;`;
			container.appendChild(movesEl);

			// Create analysis panel (if analysis data is available)
			let analysisPanelEl: HTMLDivElement | null = null;
			if (analysis) {
				analysisPanelEl = document.createElement('div');
				analysisPanelEl.className = 'analysis-panel';
				analysisPanelEl.setAttribute('role', 'region');
				analysisPanelEl.setAttribute('aria-label', 'Position analysis');
				analysisPanelEl.style.cssText = 'margin-top: 15px; padding: 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary);';
				container.appendChild(analysisPanelEl);
			}
			let currentPly = 0;
			let autoplayTimer: number | null = null;
			let isPlaying = false;
			let flipped = false;
			const autoplayAllowed = totalPlies <= 500;
			let playBtn: HTMLButtonElement | null = null;
			let shouldScrollToMove = false; // Flag to control when to scroll (false on initial render)
			let highlightedCheckSquare: string | null = null;
			let highlightedLastMoveSquares: { from: string | null; to: string | null } = { from: null, to: null };

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
				
				// Comments removed from tooltip - infrastructure kept for future UI
				// Alternative lines removed from tooltip - infrastructure kept for future UI
				
				return parts.join(' • ');
			};

			const updateAnalysisPanel = () => {
				if (!analysisPanelEl || !analysis) {
					return;
				}

				// Get current position evaluation
				const currentAnnotation = annotationsByPly.get(currentPly);
				if (!currentAnnotation || !currentAnnotation.positionEvaluation) {
					analysisPanelEl.innerHTML = '<p>No analysis data for this position.</p>';
					return;
				}

				const posEval = currentAnnotation.positionEvaluation;
				const html: string[] = [];

				// Evaluation summary
				html.push('<div class="analysis-evaluation">');
				html.push('<h4>Evaluation</h4>');
				if (posEval.evaluationType === 'mate' && posEval.mateIn !== undefined) {
					const mateLabel = posEval.mateIn > 0 ? `Mate in ${posEval.mateIn}` : `Mate in ${Math.abs(posEval.mateIn)}`;
					html.push(`<div class="eval-value mate">${mateLabel}</div>`);
				} else {
					const evalCp = (posEval.evaluation / 100).toFixed(2);
					const sign = posEval.evaluation >= 0 ? '+' : '';
					html.push(`<div class="eval-value">${sign}${evalCp}</div>`);
				}
				html.push('</div>');

				// Engine stats
				html.push('<div class="analysis-stats">');
				html.push(`<span>Depth: ${posEval.depth}</span>`);
				if (posEval.nodes) {
					html.push(`<span>Nodes: ${(posEval.nodes / 1000000).toFixed(1)}M</span>`);
				}
				if (posEval.time) {
					html.push(`<span>Time: ${(posEval.time / 1000).toFixed(1)}s</span>`);
				}
				html.push('</div>');

				// Evaluation breakdown
				if (posEval.evaluationBreakdown && this.settings.showEvalBreakdown) {
					html.push('<div class="analysis-breakdown">');
					html.push('<h4>Breakdown</h4>');
					html.push('<ul>');
					const breakdown = posEval.evaluationBreakdown;
					if (breakdown.material !== undefined && this.settings.showEvalBreakdown.material) {
						html.push(`<li>Material: ${(breakdown.material / 100).toFixed(2)}</li>`);
					}
					if (breakdown.pawns !== undefined && this.settings.showEvalBreakdown.pawns) {
						html.push(`<li>Pawns: ${(breakdown.pawns / 100).toFixed(2)}</li>`);
					}
					if (breakdown.kingSafety !== undefined && this.settings.showEvalBreakdown.kingSafety) {
						html.push(`<li>King safety: ${(breakdown.kingSafety / 100).toFixed(2)}</li>`);
					}
					if (breakdown.mobility !== undefined && this.settings.showEvalBreakdown.mobility) {
						html.push(`<li>Mobility: ${(breakdown.mobility / 100).toFixed(2)}</li>`);
					}
					if (breakdown.space !== undefined && this.settings.showEvalBreakdown.space) {
						html.push(`<li>Space: ${(breakdown.space / 100).toFixed(2)}</li>`);
					}
					if (breakdown.threats !== undefined && this.settings.showEvalBreakdown.threats) {
						html.push(`<li>Threats: ${(breakdown.threats / 100).toFixed(2)}</li>`);
					}
					html.push('</ul>');
					html.push('</div>');
				}

				// Variations
				if (posEval.fullPvLines && posEval.fullPvLines.length > 0) {
					html.push('<div class="analysis-variations">');
					html.push('<h4>Variations</h4>');
					html.push('<ul>');
					for (const line of posEval.fullPvLines) {
						const movesStr = line.moves.slice(0, 10).join(' '); // Limit to first 10 moves
						const evalStr = line.evaluationType === 'mate' && line.mateIn !== undefined
							? `Mate in ${line.mateIn}`
							: `${line.evaluation >= 0 ? '+' : ''}${(line.evaluation / 100).toFixed(2)}`;
						html.push(`<li>${movesStr} (${evalStr})</li>`);
					}
					html.push('</ul>');
					html.push('</div>');
				}

				// Variations
				if (posEval.fullPvLines && posEval.fullPvLines.length > 0) {
					html.push('<div class="analysis-variations">');
					html.push('<h4>Variations</h4>');
					html.push('<ul>');
					for (const line of posEval.fullPvLines) {
						const movesStr = line.moves.slice(0, 10).join(' '); // Limit to first 10 moves
						const evalStr = line.evaluationType === 'mate' && line.mateIn !== undefined
							? `Mate in ${line.mateIn}`
							: `${line.evaluation >= 0 ? '+' : ''}${(line.evaluation / 100).toFixed(2)}`;
						html.push(`<li>${movesStr} (${evalStr})</li>`);
					}
					html.push('</ul>');
					html.push('</div>');
				}

				analysisPanelEl.innerHTML = html.join('');

				// Add evaluation graph
				if (analysis && analysis.moves.length > 0) {
					const graphContainer = document.createElement('div');
					graphContainer.className = 'analysis-graph';
					graphContainer.style.cssText = 'margin-top: 15px;';
					renderEvalGraph(graphContainer, analysis.moves, currentPly);
					analysisPanelEl.appendChild(graphContainer);
				}
			};

			const renderEvalGraph = (container: HTMLElement, moves: MoveAnalysis[], currentPlyIndex: number) => {
				container.innerHTML = ''; // Clear previous graph
				if (moves.length === 0) {
					return;
				}

				const width = 600;
				const height = 200;
				const padding = 40;
				const graphWidth = width - 2 * padding;
				const graphHeight = height - 2 * padding;

				// Prepare data points
				const dataPoints: Array<{ x: number; y: number; ply: number; eval: number; isMate: boolean; quality?: MoveQuality }> = [];
				for (let i = 0; i < moves.length; i++) {
					const move = moves[i];
					const evalCp = move.evaluationAfter;
					// Clamp mate scores for display (but mark them)
					const isMate = move.positionEvaluation.evaluationType === 'mate';
					const displayEval = isMate ? (evalCp > 0 ? 10 : -10) : Math.max(-10, Math.min(10, evalCp / 100));
					dataPoints.push({
						x: i,
						y: displayEval,
						ply: move.ply,
						eval: evalCp,
						isMate,
						quality: move.quality,
					});
				}

				// Create SVG
				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('width', width.toString());
				svg.setAttribute('height', height.toString());
				svg.style.cssText = 'max-width: 100%; height: auto;';

				// Draw axes
				const zeroY = padding + graphHeight / 2;
				const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
				line.setAttribute('x1', padding.toString());
				line.setAttribute('y1', zeroY.toString());
				line.setAttribute('x2', (width - padding).toString());
				line.setAttribute('y2', zeroY.toString());
				line.setAttribute('stroke', 'var(--text-muted)');
				line.setAttribute('stroke-width', '1');
				svg.appendChild(line);

				// Draw evaluation line
				if (dataPoints.length > 1) {
					const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
					const pathData: string[] = [];
					for (let i = 0; i < dataPoints.length; i++) {
						const point = dataPoints[i];
						const x = padding + (point.x / (dataPoints.length - 1)) * graphWidth;
						const y = zeroY - (point.y / 10) * (graphHeight / 2);
						if (i === 0) {
							pathData.push(`M ${x} ${y}`);
						} else {
							pathData.push(`L ${x} ${y}`);
						}
					}
					path.setAttribute('d', pathData.join(' '));
					path.setAttribute('fill', 'none');
					path.setAttribute('stroke', 'var(--text-normal)');
					path.setAttribute('stroke-width', '2');
					svg.appendChild(path);
				}

				// Draw data points
				for (let i = 0; i < dataPoints.length; i++) {
					const point = dataPoints[i];
					const x = padding + (point.x / Math.max(1, dataPoints.length - 1)) * graphWidth;
					const y = zeroY - (point.y / 10) * (graphHeight / 2);

					// Check if this is the current ply
					const isCurrentPly = point.ply === currentPlyIndex;

					// Color based on move quality
					let color = 'var(--text-normal)';
					if (point.quality === MoveQuality.BLUNDER) {
						color = '#dc2626'; // red
					} else if (point.quality === MoveQuality.MISTAKE) {
						color = '#ea580c'; // orange
					} else if (point.quality === MoveQuality.INACCURACY) {
						color = '#f59e0b'; // amber
					}

					const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
					circle.setAttribute('cx', x.toString());
					circle.setAttribute('cy', y.toString());
					circle.setAttribute('r', (isCurrentPly ? '5' : '3'));
					circle.setAttribute('fill', isCurrentPly ? 'var(--interactive-accent)' : color);
					circle.setAttribute('stroke', isCurrentPly ? 'var(--text-normal)' : 'none');
					circle.setAttribute('stroke-width', isCurrentPly ? '2' : '0');
					svg.appendChild(circle);

					// Add tooltip
					const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
					const evalStr = point.isMate
						? `Mate`
						: `${point.eval >= 0 ? '+' : ''}${(point.eval / 100).toFixed(2)}`;
					title.textContent = `Ply ${point.ply}: ${evalStr}`;
					circle.appendChild(title);
				}

				// Add labels
				const yAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
				yAxisLabel.setAttribute('x', '10');
				yAxisLabel.setAttribute('y', (padding + graphHeight / 2).toString());
				yAxisLabel.setAttribute('fill', 'var(--text-muted)');
				yAxisLabel.setAttribute('font-size', '12');
				yAxisLabel.textContent = '0.0';
				svg.appendChild(yAxisLabel);

				container.appendChild(svg);
			};

			const buildMovesList = () => {
				movesEl.textContent = '';
				const fragment = document.createDocumentFragment();

				// Group moves into turn pairs (white + black)
				for (let i = 0; i < history.length; i += 2) {
					const moveNumber = Math.floor(i / 2) + 1;
					const whiteMove = history[i] as any;
					const blackMove = history[i + 1] as any;

					// Create turn pair container (inline row)
					const turnPairDiv = document.createElement('div');
					turnPairDiv.className = 'move-turn-pair';

					// Move number
					const numberSpan = document.createElement('span');
					numberSpan.className = 'move-number';
					numberSpan.textContent = `${moveNumber}. `;
					turnPairDiv.appendChild(numberSpan);

					// White move
					const whiteMoveSpan = document.createElement('span');
					whiteMoveSpan.className = 'chess-move';
					whiteMoveSpan.dataset.ply = String(i);

					// Wrap move notation in fixed-width span
					const whiteMoveNotation = document.createElement('span');
					whiteMoveNotation.className = 'move-notation';
					whiteMoveNotation.textContent = whiteMove.san;
					whiteMoveSpan.appendChild(whiteMoveNotation);

					const whiteAnnotation = annotationsByPly.get(i);
					if (whiteAnnotation) {
						whiteMoveSpan.classList.add('has-annotation', `quality-${whiteAnnotation.quality}`);
						const symbol = QUALITY_SYMBOLS[whiteAnnotation.quality];
						if (symbol) {
							const symbolSpan = document.createElement('span');
							symbolSpan.className = 'move-annotation-symbol';
							symbolSpan.textContent = symbol;
							whiteMoveSpan.appendChild(symbolSpan);
						}
						whiteMoveSpan.setAttribute('title', buildAnnotationTooltip(whiteAnnotation));
					}

					whiteMoveSpan.addEventListener('click', () => {
						currentPly = i + 1;
						isPlaying = false;
						if (autoplayTimer) {
							clearInterval(autoplayTimer);
							autoplayTimer = null;
						}
						if (playBtn) {
							playBtn.textContent = '▶';
						}
						shouldScrollToMove = true; // Scroll to clicked move
						render();
					});

					moveElements[i] = whiteMoveSpan;
					turnPairDiv.appendChild(whiteMoveSpan);

					// Black move (if exists)
					if (blackMove) {
						const blackMoveSpan = document.createElement('span');
						blackMoveSpan.className = 'chess-move';
						blackMoveSpan.dataset.ply = String(i + 1);

						// Wrap move notation in fixed-width span
						const blackMoveNotation = document.createElement('span');
						blackMoveNotation.className = 'move-notation';
						blackMoveNotation.textContent = blackMove.san;
						blackMoveSpan.appendChild(blackMoveNotation);

						const blackAnnotation = annotationsByPly.get(i + 1);
						if (blackAnnotation) {
							blackMoveSpan.classList.add('has-annotation', `quality-${blackAnnotation.quality}`);
							const symbol = QUALITY_SYMBOLS[blackAnnotation.quality];
							if (symbol) {
								const symbolSpan = document.createElement('span');
								symbolSpan.className = 'move-annotation-symbol';
								symbolSpan.textContent = symbol;
								blackMoveSpan.appendChild(symbolSpan);
							}
							blackMoveSpan.setAttribute('title', buildAnnotationTooltip(blackAnnotation));
						}

						blackMoveSpan.addEventListener('click', () => {
							currentPly = i + 2;
							isPlaying = false;
							if (autoplayTimer) {
								clearInterval(autoplayTimer);
								autoplayTimer = null;
							}
							if (playBtn) {
								playBtn.textContent = '▶';
							}
							shouldScrollToMove = true; // Scroll to clicked move
							render();
						});

						moveElements[i + 1] = blackMoveSpan;
						turnPairDiv.appendChild(blackMoveSpan);
					}

					fragment.appendChild(turnPairDiv);
				}

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

				try {
					interactiveGame.load(fenPositions[currentPly]);
				} catch (error) {
					logError('Failed to synchronize interactive board state', {
						ply: currentPly,
						fen: fenPositions[currentPly],
						error
					});
					interactiveGame.reset();
					interactiveGame.load(fenPositions[0]);
				}

				// Update check highlight after board position is set
				// Use setTimeout to ensure shadow DOM has updated
				window.setTimeout(() => {
					updateCheckHighlight();
					
					// Update last move highlight
					if (currentPly > 0 && currentPly <= history.length) {
						const lastMove = history[currentPly - 1];
						if (lastMove && typeof lastMove === 'object' && lastMove.from && lastMove.to) {
							applyLastMoveHighlight(lastMove.from, lastMove.to);
						} else {
							applyLastMoveHighlight(null, null);
						}
					} else {
						// Starting position - no last move
						applyLastMoveHighlight(null, null);
					}
				}, 0);

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
				// Only scroll to move when explicitly navigating (not on manual board interactions)
				if (currentMoveElement && shouldScrollToMove) {
					ensureMoveVisible(currentMoveElement);
					shouldScrollToMove = false; // Reset flag after scrolling
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

				// Update analysis panel
				updateAnalysisPanel();
			};

			// Control functions
			const navigateMove = (direction: number) => {
				currentPly = Math.max(0, Math.min(totalPlies, currentPly + direction));
				shouldScrollToMove = true; // Enable scrolling for navigation
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
				shouldScrollToMove = false; // Don't scroll after reset, we already scrolled to top
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
						if (currentPly >= totalPlies) {
							toggleAutoplay(); // Stop at end
						} else {
							shouldScrollToMove = true; // Enable scrolling for autoplay
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

			const isValidSquare = (value: unknown): value is string =>
				typeof value === 'string' && /^[a-h][1-8]$/.test(value);

			const applyCheckHighlight = (square: string | null) => {
				try {
					const shadow = (boardEl as any)?.shadowRoot as ShadowRoot | null | undefined;
					if (!shadow) {
						return;
					}

					const clearHighlight = (targetSquare: string) => {
						try {
							const squareEl = shadow.querySelector<HTMLElement>(`[data-square="${targetSquare}"]`);
							if (squareEl) {
								// Clear check highlight but preserve last move highlight if present
								const isLastMoveSquare = targetSquare === highlightedLastMoveSquares.from || targetSquare === highlightedLastMoveSquares.to;
								if (isLastMoveSquare) {
									// Keep last move highlight, just remove check highlight
									squareEl.style.boxShadow = 'inset 0 0 0 3px rgba(147, 197, 253, 0.4)';
									squareEl.style.backgroundColor = 'rgba(147, 197, 253, 0.08)';
								} else {
									// Clear both styles
									squareEl.style.boxShadow = '';
									squareEl.style.backgroundColor = '';
								}
							}
						} catch (error) {
							// Silently fail if square element not found
						}
					};

					if (highlightedCheckSquare) {
						clearHighlight(highlightedCheckSquare);
						highlightedCheckSquare = null;
					}

					if (!square) {
						return;
					}

					const squareEl = shadow.querySelector<HTMLElement>(`[data-square="${square}"]`);
					if (!squareEl) {
						return;
					}

					// Check if this square is also part of the last move
					const isLastMoveSquare = square === highlightedLastMoveSquares.from || square === highlightedLastMoveSquares.to;
					if (isLastMoveSquare) {
						// Combine check and last move highlights
						squareEl.style.boxShadow = 'inset 0 0 0 4px rgba(248, 113, 113, 0.85), inset 0 0 0 3px rgba(147, 197, 253, 0.4)';
						squareEl.style.backgroundColor = 'rgba(248, 113, 113, 0.18)';
					} else {
						// Just check highlight
						squareEl.style.boxShadow = 'inset 0 0 0 4px rgba(248, 113, 113, 0.85)';
						squareEl.style.backgroundColor = 'rgba(248, 113, 113, 0.18)';
					}
					highlightedCheckSquare = square;
				} catch (error) {
					// Silently fail if shadow DOM access fails
					logError('Failed to apply check highlight', error);
				}
			};

			const updateCheckHighlight = () => {
				// Use chess.js built-in method to check if current side is in check
				if (!interactiveGame.inCheck()) {
					applyCheckHighlight(null);
					return;
				}

				// Use chess.js board() method which returns pieces with square property
				const board = interactiveGame.board();
				const turnColor = interactiveGame.turn();
				let kingSquare: string | null = null;

				// Iterate through board array - each piece object already has the square property
				for (const rank of board) {
					for (const piece of rank) {
						if (piece && piece.type === 'k' && piece.color === turnColor && piece.square) {
							kingSquare = piece.square;
							break;
						}
					}
					if (kingSquare) {
						break;
					}
				}

				applyCheckHighlight(kingSquare);
			};

			const applyLastMoveHighlight = (from: string | null, to: string | null) => {
				try {
					const shadow = (boardEl as any)?.shadowRoot as ShadowRoot | null | undefined;
					if (!shadow) {
						return;
					}

					const clearHighlight = (targetSquare: string) => {
						try {
							const squareEl = shadow.querySelector<HTMLElement>(`[data-square="${targetSquare}"]`);
							if (squareEl) {
								// Clear last move highlight styles
								// Check if this square is also the check square - if so, preserve check highlight
								if (targetSquare === highlightedCheckSquare) {
									// Keep check highlight, just remove last move boxShadow
									squareEl.style.boxShadow = 'inset 0 0 0 4px rgba(248, 113, 113, 0.85)';
									squareEl.style.backgroundColor = 'rgba(248, 113, 113, 0.18)';
								} else {
									// Clear both styles
									squareEl.style.boxShadow = '';
									squareEl.style.backgroundColor = '';
								}
							}
						} catch (error) {
							// Silently fail if square element not found
						}
					};

					// Clear previous last move highlights
					if (highlightedLastMoveSquares.from) {
						clearHighlight(highlightedLastMoveSquares.from);
					}
					if (highlightedLastMoveSquares.to) {
						clearHighlight(highlightedLastMoveSquares.to);
					}

					highlightedLastMoveSquares = { from: null, to: null };

					if (!from || !to) {
						return;
					}

					// Apply highlight to both squares
					const fromSquareEl = shadow.querySelector<HTMLElement>(`[data-square="${from}"]`);
					const toSquareEl = shadow.querySelector<HTMLElement>(`[data-square="${to}"]`);

					if (fromSquareEl) {
						if (from === highlightedCheckSquare) {
							// Combine check and last move highlights
							fromSquareEl.style.boxShadow = 'inset 0 0 0 4px rgba(248, 113, 113, 0.85), inset 0 0 0 3px rgba(147, 197, 253, 0.4)';
							fromSquareEl.style.backgroundColor = 'rgba(248, 113, 113, 0.18)';
						} else {
							fromSquareEl.style.boxShadow = 'inset 0 0 0 3px rgba(147, 197, 253, 0.4)';
							fromSquareEl.style.backgroundColor = 'rgba(147, 197, 253, 0.08)';
						}
					}

					if (toSquareEl) {
						if (to === highlightedCheckSquare) {
							// Combine check and last move highlights
							toSquareEl.style.boxShadow = 'inset 0 0 0 4px rgba(248, 113, 113, 0.85), inset 0 0 0 3px rgba(147, 197, 253, 0.4)';
							toSquareEl.style.backgroundColor = 'rgba(248, 113, 113, 0.18)';
						} else {
							toSquareEl.style.boxShadow = 'inset 0 0 0 3px rgba(147, 197, 253, 0.4)';
							toSquareEl.style.backgroundColor = 'rgba(147, 197, 253, 0.08)';
						}
					}

					highlightedLastMoveSquares = { from, to };
				} catch (error) {
					// Silently fail if shadow DOM access fails
					logError('Failed to apply last move highlight', error);
				}
			};

			const choosePromotionPiece = async (color: 'w' | 'b', options: PromotionPiece[]): Promise<PromotionPiece> => {
				const validOptions = options.filter(
					(option): option is PromotionPiece => option === 'q' || option === 'r' || option === 'b' || option === 'n'
				);
				const uniqueOptions = (validOptions.length ? Array.from(new Set(validOptions)) : (['q'] as PromotionPiece[]));
				try {
					const modal = new PromotionModal(this.app, color, uniqueOptions);
					return await modal.openWithPromise(uniqueOptions[0] ?? 'q');
				} catch (error) {
					logError('Promotion selection failed', error);
					return uniqueOptions[0] ?? 'q';
				}
			};

			boardEl.addEventListener('drag-start', (event: Event) => {
				const dragEvent = event as CustomEvent<{
					source: unknown;
					piece: unknown;
				}>;
				const detail = dragEvent.detail;
				if (!detail) {
					event.preventDefault();
					return;
				}

				const { source, piece } = detail;
				if (!isValidSquare(source) || typeof piece !== 'string') {
					event.preventDefault();
					return;
				}

				const isWhitePiece = piece.startsWith('w');
				const turn = interactiveGame.turn(); // 'w' or 'b'
				if ((turn === 'w' && !isWhitePiece) || (turn === 'b' && isWhitePiece)) {
					event.preventDefault();
					return;
				}

				const legalMoves = interactiveGame.moves({ square: source as string, verbose: true } as any);
				if (!Array.isArray(legalMoves) || legalMoves.length === 0) {
					event.preventDefault();
					return;
				}

				if (isPlaying) {
					toggleAutoplay();
				}
			});

			boardEl.addEventListener('drop', (event: Event) => {
				try {
					const dropEvent = event as CustomEvent<{
						source: unknown;
						target: unknown;
						piece: unknown;
						setAction: (action: 'drop' | 'snapback' | 'trash') => void;
					}>;
					const detail = dropEvent.detail;
					if (!detail || typeof detail.setAction !== 'function') {
						return;
					}

					const source = detail.source;
					const target = detail.target;
					const piece = typeof detail.piece === 'string' ? detail.piece : '';

					if (!isValidSquare(source) || !isValidSquare(target)) {
						detail.setAction('snapback');
						return;
					}

					const legalMoves = interactiveGame.moves({ square: source as string, verbose: true } as any) as Array<{
						color: string;
						from: string;
						to: string;
						flags: string;
						piece: string;
						promotion?: PromotionPiece;
						san: string;
					}>;
					if (!Array.isArray(legalMoves) || legalMoves.length === 0) {
						detail.setAction('snapback');
						return;
					}

					const candidateMoves = legalMoves.filter((legalMove) => legalMove.to === target);
					if (candidateMoves.length === 0) {
						detail.setAction('snapback');
						return;
					}

					const promotionMoves = candidateMoves.filter((moveOption) => typeof moveOption.promotion === 'string');
					if (promotionMoves.length > 1) {
						detail.setAction('snapback');
						window.setTimeout(() => {
							(async () => {
								const color = promotionMoves[0].color === 'w' ? 'w' : 'b';
								const options = promotionMoves
									.map((option) => option.promotion)
									.filter((option): option is PromotionPiece =>
										option === 'q' || option === 'r' || option === 'b' || option === 'n'
									);
								const promotion = await choosePromotionPiece(color, options);

								const chosenPromotionMove =
									promotionMoves.find((option) => option.promotion === promotion) ?? promotionMoves[0];

								const promotionChoice: PromotionPiece =
									chosenPromotionMove.promotion && (chosenPromotionMove.promotion === 'q' || chosenPromotionMove.promotion === 'r' || chosenPromotionMove.promotion === 'b' || chosenPromotionMove.promotion === 'n')
										? chosenPromotionMove.promotion
										: promotion;

								const moveResult = interactiveGame.move({
									from: chosenPromotionMove.from,
									to: chosenPromotionMove.to,
									promotion: promotionChoice
								});

								if (!moveResult) {
									return;
								}

								// Wait for any pending drop animations to complete before updating
								// Use a small delay to ensure chessboard-element has finished processing
								window.setTimeout(() => {
									boardEl.setPosition(interactiveGame.fen(), true);
									window.setTimeout(() => {
										updateCheckHighlight();
										// Highlight the promotion move
										applyLastMoveHighlight(chosenPromotionMove.from, chosenPromotionMove.to);
									}, 0);

									const moveLabel =
										typeof moveResult.san === 'string' ? moveResult.san : `${chosenPromotionMove.from}-${chosenPromotionMove.to}`;
									liveRegion.textContent = `Manual move ${moveLabel}`;

									moveElements.forEach((moveEl) => {
										moveEl?.classList.remove('current');
									});
								}, 100);
							})().catch((error) => {
								logError('Failed to process promotion selection', error);
							});
						}, 0);
						return;
					}

					const chosenMove = candidateMoves[0];
					const moveParams: { from: string; to: string; promotion?: PromotionPiece } = {
						from: chosenMove.from,
						to: chosenMove.to
					};

					if (
						typeof chosenMove.promotion === 'string' &&
						(chosenMove.promotion === 'q' || chosenMove.promotion === 'r' || chosenMove.promotion === 'b' || chosenMove.promotion === 'n')
					) {
						moveParams.promotion = chosenMove.promotion;
					}

					const moveResult = interactiveGame.move(moveParams);
					if (!moveResult) {
						detail.setAction('snapback');
						return;
					}

					detail.setAction('drop');
					
					// Wait for chessboard-element to complete drop processing before updating position
					// Listen for snap-end event which fires after drop is complete
					let dropCompleteHandled = false;
					const handleDropComplete = () => {
						if (dropCompleteHandled) return;
						dropCompleteHandled = true;
						
						boardEl.removeEventListener('snap-end', handleDropComplete);
						boardEl.removeEventListener('snapback-end', handleDropComplete);
						
						// Now it's safe to update the board position
						boardEl.setPosition(interactiveGame.fen(), true);
						window.setTimeout(() => {
							updateCheckHighlight();
							// Highlight the last move
							applyLastMoveHighlight(chosenMove.from, chosenMove.to);
						}, 0);

						const moveLabel = typeof moveResult.san === 'string' ? moveResult.san : `${chosenMove.from}-${chosenMove.to}`;
						liveRegion.textContent = `Manual move ${moveLabel}`;

						moveElements.forEach((moveEl) => {
							moveEl?.classList.remove('current');
						});
					};
					
					// Listen for both snap-end (successful drop) and snapback-end (in case something goes wrong)
					boardEl.addEventListener('snap-end', handleDropComplete, { once: true });
					boardEl.addEventListener('snapback-end', handleDropComplete, { once: true });
					
					// Fallback timeout in case events don't fire (shouldn't happen, but safety net)
					window.setTimeout(() => {
						if (!dropCompleteHandled) {
							boardEl.removeEventListener('snap-end', handleDropComplete);
							boardEl.removeEventListener('snapback-end', handleDropComplete);
							handleDropComplete();
						}
					}, 1000);
				} catch (error) {
					logError('Error in drop handler', error);
					// Ensure setAction is called even on error
					try {
						const dropEvent = event as CustomEvent<{ setAction?: (action: 'drop' | 'snapback' | 'trash') => void }>;
						if (dropEvent.detail?.setAction) {
							dropEvent.detail.setAction('snapback');
						}
					} catch (e) {
						// Ignore errors in error handler
					}
				}
			});

			// Control buttons
			this.createButton(controlsEl, '←', 'Previous move', () => navigateMove(-1));
			this.createButton(controlsEl, '→', 'Next move', () => navigateMove(1));
			this.createButton(controlsEl, '↺', 'Reset to start', resetPosition);
			playBtn = this.createButton(controlsEl, '▶', autoplayAllowed ? 'Play/Pause' : 'Autoplay disabled (too many moves)', toggleAutoplay);
			this.createButton(controlsEl, '⇅', 'Flip board', flipBoard);

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
		button.type = 'button';
		button.classList.add('chess-control-button');
		button.setAttribute('aria-label', title);
		button.setAttribute('title', title);

		const iconSpan = document.createElement('span');
		iconSpan.className = 'chess-control-icon';
		iconSpan.setAttribute('aria-hidden', 'true');
		iconSpan.textContent = text;
		button.appendChild(iconSpan);

		const srLabel = document.createElement('span');
		srLabel.className = 'sr-only';
		srLabel.textContent = title;
		button.appendChild(srLabel);

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
					limitStrength: this.settings.limitStrength,
					elo: this.settings.limitStrength ? this.settings.defaultEngineElo : undefined,
					skillLevel: this.settings.limitStrength ? this.settings.defaultEngineSkill : undefined,
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
