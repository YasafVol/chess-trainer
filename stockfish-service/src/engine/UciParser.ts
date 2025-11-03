/**
 * UCI Protocol Parser
 * Parses Stockfish UCI output into structured analysis results
 */

import { AnalysisResponse, Evaluation, PvLine, EngineStatistics } from '../types';

export class UciParser {
	/**
	 * Parse UCI analysis output into AnalysisResponse
	 */
	static parseAnalysis(output: string, timingMs: number): AnalysisResponse {
		const lines = output.split('\n').filter((line) => line.trim());
		
		let bestMove = '';
		let ponder = '';
		let evaluation: Evaluation = { type: 'cp', value: 0 };
		const linesMap = new Map<number, PvLine>();
		let depth = 0;
		let selDepth = 0;
		let nodes = 0;
		let nps = 0;

		for (const line of lines) {
			// Parse bestmove line
			if (line.startsWith('bestmove')) {
				const bestmoveMatch = line.match(/bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/);
				if (bestmoveMatch) {
					bestMove = bestmoveMatch[1];
					if (bestmoveMatch[2]) {
						ponder = bestmoveMatch[2];
					}
				}
				continue;
			}

			// Parse info lines
			if (line.startsWith('info')) {
				// Extract depth
				const depthMatch = line.match(/depth\s+(\d+)/);
				if (depthMatch) {
					depth = Math.max(depth, parseInt(depthMatch[1], 10));
				}

				// Extract selective depth
				const selDepthMatch = line.match(/seldepth\s+(\d+)/);
				if (selDepthMatch) {
					selDepth = Math.max(selDepth, parseInt(selDepthMatch[1], 10));
				}

				// Extract nodes
				const nodesMatch = line.match(/nodes\s+(\d+)/);
				if (nodesMatch) {
					nodes = Math.max(nodes, parseInt(nodesMatch[1], 10));
				}

				// Extract nps (nodes per second)
				const npsMatch = line.match(/nps\s+(\d+)/);
				if (npsMatch) {
					nps = Math.max(nps, parseInt(npsMatch[1], 10));
				}

				// Extract score
				const scoreMatch = line.match(/score\s+(cp|mate)\s+(-?\d+)/);
				if (scoreMatch) {
					const scoreType = scoreMatch[1] as 'cp' | 'mate';
					const scoreValue = parseInt(scoreMatch[2], 10);
					evaluation = { type: scoreType, value: scoreValue };
				}

				// Extract multipv number
				const multipvMatch = line.match(/multipv\s+(\d+)/);
				const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;

				// Extract PV (principal variation)
				const pvMatch = line.match(/pv\s+(.+)/);
				if (pvMatch) {
					const pvMoves = pvMatch[1].trim().split(/\s+/);
					const pvLine: PvLine = {
						pv: pvMoves,
						eval: evaluation,
					};
					linesMap.set(multipv, pvLine);
				}
			}
		}

		// Convert lines map to array (sorted by multipv)
		const linesArray: PvLine[] = Array.from(linesMap.entries())
			.sort(([a], [b]) => a - b)
			.map(([, line]) => line);

		// If no lines found but we have a bestmove, create a default line
		if (linesArray.length === 0 && bestMove) {
			linesArray.push({
				pv: [bestMove],
				eval: evaluation,
			});
		}

		// Build statistics
		const statistics: EngineStatistics = {
			depth,
			selDepth: selDepth > 0 ? selDepth : undefined,
			nodes,
			nps,
		};

		return {
			bestMove,
			ponder: ponder || undefined,
			evaluation,
			lines: linesArray,
			statistics,
			timingMs,
		};
	}
}

