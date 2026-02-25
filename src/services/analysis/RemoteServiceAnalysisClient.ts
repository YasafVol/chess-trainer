/**
 * Remote Service Analysis Client
 * HTTP client for communicating with Stockfish companion service
 */

import { Notice } from 'obsidian';
import { AnalysisClient, AnalysisOptions } from './AnalysisClient';
import { PositionEvaluation, GameAnalysis, MoveAnalysis, MoveQuality, AnalysisStatistics } from '../../types/analysis';
import { logInfo, logError } from '../../util/logger';
// @ts-ignore - Bundled dependency
import { Chess } from '../../deps/chess.js.mjs';

/**
 * Response type from companion service
 */
interface ServiceAnalysisResponse {
	bestMove: string;
	ponder?: string;
	evaluation: {
		type: 'cp' | 'mate';
		value: number;
	};
	evaluationType: 'cp' | 'mate';
	mateIn?: number;
	evaluationBreakdown?: {
		material?: number;
		imbalance?: number;
		pawns?: number;
		knights?: number;
		bishops?: number;
		rooks?: number;
		queens?: number;
		mobility?: number;
		kingSafety?: number;
		threats?: number;
		passedPawns?: number;
		space?: number;
		total?: number;
	};
	lines: Array<{
		pv: string[];
		eval: {
			type: 'cp' | 'mate';
			value: number;
		};
	}>;
	statistics: {
		depth: number;
		selDepth?: number;
		nodes: number;
		nps: number;
	};
	timingMs: number;
}

export class RemoteServiceAnalysisClient implements AnalysisClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		// Ensure URL doesn't end with trailing slash
		this.baseUrl = baseUrl.replace(/\/$/, '');
	}

	/**
	 * Check if service is available
	 */
	async ping(): Promise<boolean> {
		try {
			const response = await fetch(`${this.baseUrl}/health`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			return response.ok;
		} catch (error) {
			logError('Failed to ping analysis service', error);
			return false;
		}
	}

	/**
	 * Analyze a chess position
	 */
	async analyzePosition(
		fen: string,
		moves?: string[],
		options: AnalysisOptions = {}
	): Promise<PositionEvaluation> {
		const requestBody: any = {
			fen,
			moves: moves || [],
			depth: options.depth || 14,
			multiPV: options.multiPV || 1,
			movetimeMs: options.movetimeMs || 0,
		};

		// Add engine strength options if provided
		if (options.limitStrength !== undefined) {
			requestBody.limitStrength = options.limitStrength;
		}
		if (options.elo !== undefined) {
			requestBody.elo = options.elo;
		}
		if (options.skillLevel !== undefined) {
			requestBody.skillLevel = options.skillLevel;
		}

		try {
			const response = await fetch(`${this.baseUrl}/analyze`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				if (response.status === 504) {
					throw new Error('Analysis timeout - try reducing depth or setting movetime');
				}
				if (response.status === 503) {
					throw new Error('Analysis service unavailable - ensure the service is running');
				}
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Analysis failed: ${response.statusText}`);
			}

			const data: ServiceAnalysisResponse = await response.json();
			return this.convertToPositionEvaluation(data, fen, moves);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logError('Analysis request failed', error);
			
			if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ECONNREFUSED')) {
				new Notice('Stockfish companion service not reachable. Start the service or update the URL in settings.');
			} else {
				new Notice(`Analysis failed: ${errorMessage}`);
			}
			
			throw error;
		}
	}

	/**
	 * Analyze an entire game
	 */
	async analyzeGame(
		initialFen: string,
		moves: string[],
		options: AnalysisOptions = {}
	): Promise<GameAnalysis> {
		const startTime = Date.now();
		const moveAnalyses: MoveAnalysis[] = [];
		
		// Analyze each position in the game
		for (let i = 0; i <= moves.length; i++) {
			const movesSoFar = moves.slice(0, i);
			
			try {
				const evaluationBefore = await this.analyzePosition(initialFen, movesSoFar, options);
				const evaluationAfter = i < moves.length 
					? await this.analyzePosition(initialFen, movesSoFar.concat([moves[i]]), options)
					: evaluationBefore;

				const playedMove = i < moves.length ? moves[i] : '';
				const bestMove = evaluationBefore.bestMove;
				const evaluationDiff = Math.abs(evaluationAfter.evaluation - evaluationBefore.evaluation);
				const quality = this.classifyMoveQuality(evaluationBefore.evaluation, evaluationAfter.evaluation, evaluationDiff);

				// Get full PV lines from the service response
				// Use fullPvLines if available, otherwise fall back to alternativeMoves
				const alternativeLines = evaluationBefore.fullPvLines && evaluationBefore.fullPvLines.length > 0
					? evaluationBefore.fullPvLines.map((pvLine) => ({
						moves: pvLine.moves,
						evaluation: pvLine.evaluation,
					}))
					: (evaluationBefore.alternativeMoves && evaluationBefore.alternativeMoves.length > 0
						? evaluationBefore.alternativeMoves.map((alt) => ({
							moves: [alt.move], // First move of PV line
							evaluation: alt.evaluation,
						}))
						: undefined);

				const moveAnalysis: MoveAnalysis = {
					moveNumber: Math.floor(i / 2) + 1,
					ply: i,
					playedMove,
					evaluationBefore: evaluationBefore.evaluation,
					evaluationAfter: evaluationAfter.evaluation,
					bestMove,
					bestMoveEvaluation: evaluationBefore.evaluation,
					quality,
					evaluationDiff,
					positionEvaluation: evaluationBefore,
					alternativeLines,
				};

				moveAnalyses.push(moveAnalysis);
			} catch (error) {
				logError(`Failed to analyze move ${i}`, error);
				// Continue with next move even if one fails
			}
		}

		const analysisTime = Date.now() - startTime;
		const statistics = this.calculateStatistics(moveAnalyses);

		return {
			gameHash: '', // Will be set by caller
			analysisDate: new Date().toISOString(),
			depth: options.depth || 14,
			analysisTime,
			moves: moveAnalyses,
			statistics,
		};
	}

	/**
	 * Convert UCI move notation to SAN
	 */
	private uciToSan(fen: string, moves: string[], uciMove: string): string {
		try {
			const tempGame = new Chess(fen);
			for (const move of moves) {
				tempGame.move(move);
			}
			const moveObj = tempGame.move({ from: uciMove.substring(0, 2), to: uciMove.substring(2, 4), promotion: uciMove.length > 4 ? uciMove[4] : undefined });
			return moveObj ? moveObj.san : uciMove;
		} catch (error) {
			logError('Failed to convert UCI to SAN', error);
			return uciMove;
		}
	}

	/**
	 * Convert service response to PositionEvaluation
	 */
	private convertToPositionEvaluation(data: ServiceAnalysisResponse, fen?: string, moves?: string[]): PositionEvaluation {
		// Preserve mate scores - don't convert to ±10000
		const evaluationType = data.evaluationType || data.evaluation.type;
		const evaluation = evaluationType === 'cp' 
			? data.evaluation.value 
			: (data.evaluation.value > 0 ? 10000 : -10000); // Keep backward compat for display

		// Convert best move from UCI to SAN
		let bestMoveSan = data.bestMove;
		if (fen && moves && data.bestMove.length === 4) {
			try {
				bestMoveSan = this.uciToSan(fen, moves, data.bestMove);
			} catch (error) {
				logError('Failed to convert best move UCI to SAN', error);
			}
		}

		// Convert alternative moves (first move only)
		const alternativeMoves = data.lines.slice(1).map((line) => {
			const firstMoveUci = line.pv[0] || '';
			let firstMoveSan = firstMoveUci;
			if (fen && moves && firstMoveUci.length === 4) {
				try {
					firstMoveSan = this.uciToSan(fen, moves, firstMoveUci);
				} catch (error) {
					// Fallback to UCI if conversion fails
				}
			}
			const evalValue = line.eval.type === 'cp' ? line.eval.value : (line.eval.value > 0 ? 10000 : -10000);
			return {
				move: firstMoveSan,
				evaluation: evalValue,
			};
		});

		// Convert full PV lines from UCI to SAN
		const fullPvLines = data.lines.map((line) => {
			const sanMoves: string[] = [];
			if (fen && moves) {
				try {
					const tempGame = new Chess(fen);
					// Apply existing moves to get to current position
					for (const move of moves) {
						if (typeof move === 'string') {
							// Try UCI format first
							if (move.length === 4 || move.length === 5) {
								const from = move.substring(0, 2);
								const to = move.substring(2, 4);
								const promotion = move.length > 4 ? move[4] : undefined;
								tempGame.move({ from, to, promotion });
							} else {
								// Assume SAN
								tempGame.move(move);
							}
						}
					}
					// Now convert PV moves
					for (const uciMove of line.pv) {
						if (uciMove.length >= 4) {
							const from = uciMove.substring(0, 2);
							const to = uciMove.substring(2, 4);
							const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
							const moveObj = tempGame.move({ from, to, promotion });
							if (moveObj) {
								sanMoves.push(moveObj.san);
							} else {
								break; // Invalid move in PV
							}
						}
					}
				} catch (error) {
					logError('Failed to convert PV line UCI to SAN', error);
					// Fallback to UCI moves
					return {
						moves: line.pv,
						evaluation: line.eval.type === 'cp' ? line.eval.value : (line.eval.value > 0 ? 10000 : -10000),
						evaluationType: line.eval.type,
						mateIn: line.eval.type === 'mate' ? line.eval.value : undefined,
					};
				}
			} else {
				// No FEN/moves provided, return UCI moves
				sanMoves.push(...line.pv);
			}

			return {
				moves: sanMoves,
				evaluation: line.eval.type === 'cp' ? line.eval.value : (line.eval.value > 0 ? 10000 : -10000),
				evaluationType: line.eval.type,
				mateIn: line.eval.type === 'mate' ? line.eval.value : undefined,
			};
		});

		return {
			evaluation,
			evaluationType,
			mateIn: data.mateIn,
			bestMove: bestMoveSan,
			alternativeMoves: alternativeMoves.length > 0 ? alternativeMoves : undefined,
			fullPvLines: fullPvLines.length > 0 ? fullPvLines : undefined,
			evaluationBreakdown: data.evaluationBreakdown,
			depth: data.statistics.depth,
			nodes: data.statistics.nodes,
			time: data.timingMs,
		};
	}

	/**
	 * Classify move quality based on evaluation change
	 */
	private classifyMoveQuality(
		evalBefore: number,
		evalAfter: number,
		evalDiff: number
	): MoveQuality {
		const isWhiteMove = evalBefore >= 0;
		const evaluationWorsened = isWhiteMove 
			? evalAfter < evalBefore
			: evalAfter > evalBefore;

		if (!evaluationWorsened) {
			return MoveQuality.BEST;
		}

		if (evalDiff >= 300) {
			return MoveQuality.BLUNDER;
		} else if (evalDiff >= 100) {
			return MoveQuality.MISTAKE;
		} else if (evalDiff >= 50) {
			return MoveQuality.INACCURACY;
		} else if (evalDiff >= 20) {
			return MoveQuality.GOOD;
		} else {
			return MoveQuality.EXCELLENT;
		}
	}

	/**
	 * Calculate game statistics from move analyses
	 */
	private calculateStatistics(moves: MoveAnalysis[]): AnalysisStatistics {
		if (moves.length === 0) {
			return {
				averageEvaluation: 0,
				accuracy: 0,
				bestMoves: 0,
				excellentMoves: 0,
				goodMoves: 0,
				inaccuracies: 0,
				mistakes: 0,
				blunders: 0,
				totalMoves: 0,
			};
		}

		const totalEvaluation = moves.reduce((sum, m) => sum + m.evaluationAfter, 0);
		const averageEvaluation = totalEvaluation / moves.length;

		const qualityCounts = {
			best: 0,
			excellent: 0,
			good: 0,
			inaccuracy: 0,
			mistake: 0,
			blunder: 0,
		};

		for (const move of moves) {
			qualityCounts[move.quality]++;
		}

		const totalMoves = moves.length;
		const bestMovesCount = qualityCounts.best;
		const accuracy = totalMoves > 0 ? (bestMovesCount / totalMoves) * 100 : 0;

		return {
			averageEvaluation,
			accuracy,
			bestMoves: qualityCounts.best,
			excellentMoves: qualityCounts.excellent,
			goodMoves: qualityCounts.good,
			inaccuracies: qualityCounts.inaccuracy,
			mistakes: qualityCounts.mistake,
			blunders: qualityCounts.blunder,
			totalMoves,
		};
	}
}


