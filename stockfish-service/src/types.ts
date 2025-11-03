/**
 * Type definitions for Stockfish companion service
 */

import { z } from 'zod';

/**
 * Analysis request schema
 */
export const AnalysisRequestSchema = z.object({
	fen: z.string().optional(),
	moves: z.array(z.string()).optional(),
	depth: z.number().int().min(1).max(30).default(14),
	multiPV: z.number().int().min(1).max(10).default(1),
	movetimeMs: z.number().int().min(0).default(0),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

/**
 * Evaluation type (centipawn or mate)
 */
export type EvaluationType = 'cp' | 'mate';

/**
 * Evaluation value
 */
export interface Evaluation {
	type: EvaluationType;
	value: number;
}

/**
 * PV line (principal variation)
 */
export interface PvLine {
	pv: string[];
	eval: Evaluation;
}

/**
 * Engine statistics
 */
export interface EngineStatistics {
	depth: number;
	selDepth?: number;
	nodes: number;
	nps: number;
}

/**
 * Analysis response
 */
export interface AnalysisResponse {
	bestMove: string;
	ponder?: string;
	evaluation: Evaluation;
	lines: PvLine[];
	statistics: EngineStatistics;
	timingMs: number;
}

/**
 * Error response
 */
export interface ErrorResponse {
	error: string;
	message: string;
}

