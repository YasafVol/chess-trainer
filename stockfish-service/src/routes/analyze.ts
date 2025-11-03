/**
 * Analysis endpoint
 */

import { Request, Response } from 'express';
import { AnalysisRequestSchema, ErrorResponse } from '../types';
import { StockfishProcess } from '../engine/StockfishProcess';
import { UciParser } from '../engine/UciParser';

export async function analyzeHandler(
	req: Request,
	res: Response,
	stockfishProcess: StockfishProcess
): Promise<void> {
	try {
		// Validate request
		const validationResult = AnalysisRequestSchema.safeParse(req.body);
		if (!validationResult.success) {
			const errorResponse: ErrorResponse = {
				error: 'validation_error',
				message: validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
			};
			res.status(400).json(errorResponse);
			return;
		}

		const request = validationResult.data;

		// Ensure engine is ready
		if (!stockfishProcess.checkReady()) {
			await stockfishProcess.initialize();
		}

		// Perform analysis
		const startTime = Date.now();
		const output = await stockfishProcess.analyze({
			fen: request.fen,
			moves: request.moves,
			depth: request.depth,
			multiPV: request.multiPV,
			movetimeMs: request.movetimeMs,
		});
		const timingMs = Date.now() - startTime;

		// Parse output
		const analysis = UciParser.parseAnalysis(output, timingMs);

		// Return response
		res.json(analysis);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		// Check for timeout
		if (errorMessage.includes('Timeout') || errorMessage.includes('time limit')) {
			res.status(504).json({
				error: 'timeout',
				message: `Analysis exceeded time limit (depth=${req.body.depth || 14}).`,
			} as ErrorResponse);
			return;
		}

		// Generic error
		res.status(500).json({
			error: 'analysis_error',
			message: errorMessage,
		} as ErrorResponse);
	}
}

