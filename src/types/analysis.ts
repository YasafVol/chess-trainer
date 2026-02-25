/**
 * Analysis data types for chess game analysis
 */

/**
 * Evaluation breakdown components
 */
export interface EvaluationBreakdown {
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
}

export interface PositionEvaluation {
	/** Evaluation in centipawns (positive = white advantage, negative = black advantage) */
	evaluation: number;
	/** Evaluation type: 'cp' for centipawns, 'mate' for mate */
	evaluationType: 'cp' | 'mate';
	/** Mate in N moves (if evaluationType is 'mate') */
	mateIn?: number;
	/** Best move in SAN notation */
	bestMove: string;
	/** Alternative moves (multi-PV) */
	alternativeMoves?: Array<{
		move: string;
		evaluation: number;
	}>;
	/** Full PV lines (principal variations) from multi-PV analysis - moves in SAN notation */
	fullPvLines?: Array<{
		moves: string[];
		evaluation: number;
		evaluationType: 'cp' | 'mate';
		mateIn?: number;
	}>;
	/** Evaluation breakdown components */
	evaluationBreakdown?: EvaluationBreakdown;
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
	/** Optional comment for this move */
	comment?: string;
	/** Alternative lines (variations) for this position */
	alternativeLines?: Array<{
		moves: string[];
		evaluation: number;
	}>;
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

