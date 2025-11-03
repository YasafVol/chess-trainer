/**
 * Type definitions for Stockfish companion service
 */
import { z } from 'zod';
/**
 * Analysis request schema
 */
export declare const AnalysisRequestSchema: z.ZodObject<{
    fen: z.ZodOptional<z.ZodString>;
    moves: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    depth: z.ZodDefault<z.ZodNumber>;
    multiPV: z.ZodDefault<z.ZodNumber>;
    movetimeMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    depth: number;
    multiPV: number;
    movetimeMs: number;
    fen?: string | undefined;
    moves?: string[] | undefined;
}, {
    fen?: string | undefined;
    moves?: string[] | undefined;
    depth?: number | undefined;
    multiPV?: number | undefined;
    movetimeMs?: number | undefined;
}>;
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
//# sourceMappingURL=types.d.ts.map