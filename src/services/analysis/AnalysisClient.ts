/**
 * Analysis Client Interface
 * Abstract interface for chess position analysis
 */

import type { PositionEvaluation, GameAnalysis } from '../../types/analysis';

export interface AnalysisOptions {
	depth?: number;
	multiPV?: number;
	movetimeMs?: number;
}

export interface AnalysisClient {
	/**
	 * Analyze a chess position
	 */
	analyzePosition(
		fen: string,
		moves?: string[],
		options?: AnalysisOptions
	): Promise<PositionEvaluation>;

	/**
	 * Check if the analysis service is available
	 */
	ping(): Promise<boolean>;

	/**
	 * Analyze an entire game (move by move)
	 */
	analyzeGame(
		fen: string,
		moves: string[],
		options?: AnalysisOptions
	): Promise<GameAnalysis>;
}

