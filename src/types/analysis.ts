/**
 * Analysis data types for chess game analysis
 */

export interface PositionEvaluation {
	/** Evaluation in centipawns (positive = white advantage, negative = black advantage) */
	evaluation: number;
	/** Best move in SAN notation */
	bestMove: string;
	/** Alternative moves (multi-PV) */
	alternativeMoves?: Array<{
		move: string;
		evaluation: number;
	}>;
	/** Analysis depth reached */
	depth: number;
	/** Nodes searched */
	nodes?: number;
	/** Time taken in milliseconds */
	time?: number;
}

export interface MoveAnalysis {
	/** Move number (1-based) */
	moveNumber: number;
	/** Ply number (0-based) */
	ply: number;
	/** Move played in SAN */
	playedMove: string;
	/** Evaluation before move */
	evaluationBefore: number;
	/** Evaluation after move */
	evaluationAfter: number;
	/** Best move according to engine */
	bestMove: string;
	/** Evaluation after best move */
	bestMoveEvaluation: number;
	/** Move quality classification */
	quality: MoveQuality;
	/** Evaluation difference (centipawns lost) */
	evaluationDiff: number;
	/** Position evaluation details */
	positionEvaluation: PositionEvaluation;
}

export enum MoveQuality {
	BEST = 'best',
	EXCELLENT = 'excellent',
	GOOD = 'good',
	INACCURACY = 'inaccuracy',
	MISTAKE = 'mistake',
	BLUNDER = 'blunder'
}

export interface GameAnalysis {
	/** Game hash (SHA-1) */
	gameHash: string;
	/** Analysis date */
	analysisDate: string;
	/** Analysis depth used */
	depth: number;
	/** Time taken for analysis (ms) */
	analysisTime: number;
	/** Move-by-move analysis */
	moves: MoveAnalysis[];
	/** Game statistics */
	statistics: AnalysisStatistics;
}

export interface AnalysisStatistics {
	/** Average evaluation (centipawns) */
	averageEvaluation: number;
	/** Accuracy percentage */
	accuracy: number;
	/** Number of best moves */
	bestMoves: number;
	/** Number of excellent moves */
	excellentMoves: number;
	/** Number of good moves */
	goodMoves: number;
	/** Number of inaccuracies */
	inaccuracies: number;
	/** Number of mistakes */
	mistakes: number;
	/** Number of blunders */
	blunders: number;
	/** Total number of moves */
	totalMoves: number;
}

