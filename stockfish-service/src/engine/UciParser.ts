/**
 * UCI Protocol Parser
 * Parses Stockfish UCI output into structured analysis results
 */

import { AnalysisResponse, Evaluation, PvLine, EngineStatistics, EvaluationBreakdown } from '../types';

export class UciParser {
	/**
	 * Parse UCI analysis output into AnalysisResponse
	 */
	static parseAnalysis(output: string, evalOutput: string, timingMs: number): AnalysisResponse {
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

		// Determine evaluation type and mate info
		const evaluationType = evaluation.type;
		const mateIn = evaluation.type === 'mate' ? evaluation.value : undefined;

		// Parse evaluation breakdown from eval output
		const evaluationBreakdown = this.parseEvalBreakdown(evalOutput);

		return {
			bestMove,
			ponder: ponder || undefined,
			evaluation,
			evaluationType,
			mateIn,
			evaluationBreakdown,
			lines: linesArray,
			statistics,
			timingMs,
		};
	}

	/**
	 * Parse Stockfish eval command output into EvaluationBreakdown
	 */
	private static parseEvalBreakdown(evalOutput: string): EvaluationBreakdown | undefined {
		if (!evalOutput || evalOutput.trim().length === 0) {
			return undefined;
		}

		const breakdown: EvaluationBreakdown = {};
		const lines = evalOutput.split('\n').map((line) => line.trim());

		for (const line of lines) {
			// Parse material
			const materialMatch = line.match(/Material\s*:\s*(-?\d+)/i);
			if (materialMatch) {
				breakdown.material = parseInt(materialMatch[1], 10);
			}

			// Parse imbalance
			const imbalanceMatch = line.match(/Imbalance\s*:\s*(-?\d+)/i);
			if (imbalanceMatch) {
				breakdown.imbalance = parseInt(imbalanceMatch[1], 10);
			}

			// Parse pawns
			const pawnsMatch = line.match(/Pawns\s*:\s*(-?\d+)/i);
			if (pawnsMatch) {
				breakdown.pawns = parseInt(pawnsMatch[1], 10);
			}

			// Parse knights
			const knightsMatch = line.match(/Knights\s*:\s*(-?\d+)/i);
			if (knightsMatch) {
				breakdown.knights = parseInt(knightsMatch[1], 10);
			}

			// Parse bishops
			const bishopsMatch = line.match(/Bishops\s*:\s*(-?\d+)/i);
			if (bishopsMatch) {
				breakdown.bishops = parseInt(bishopsMatch[1], 10);
			}

			// Parse rooks
			const rooksMatch = line.match(/Rooks\s*:\s*(-?\d+)/i);
			if (rooksMatch) {
				breakdown.rooks = parseInt(rooksMatch[1], 10);
			}

			// Parse queens
			const queensMatch = line.match(/Queens\s*:\s*(-?\d+)/i);
			if (queensMatch) {
				breakdown.queens = parseInt(queensMatch[1], 10);
			}

			// Parse mobility
			const mobilityMatch = line.match(/Mobility\s*:\s*(-?\d+)/i);
			if (mobilityMatch) {
				breakdown.mobility = parseInt(mobilityMatch[1], 10);
			}

			// Parse king safety
			const kingSafetyMatch = line.match(/King safety\s*:\s*(-?\d+)/i);
			if (kingSafetyMatch) {
				breakdown.kingSafety = parseInt(kingSafetyMatch[1], 10);
			}

			// Parse threats
			const threatsMatch = line.match(/Threats\s*:\s*(-?\d+)/i);
			if (threatsMatch) {
				breakdown.threats = parseInt(threatsMatch[1], 10);
			}

			// Parse passed pawns
			const passedPawnsMatch = line.match(/Passed pawns\s*:\s*(-?\d+)/i);
			if (passedPawnsMatch) {
				breakdown.passedPawns = parseInt(passedPawnsMatch[1], 10);
			}

			// Parse space
			const spaceMatch = line.match(/Space\s*:\s*(-?\d+)/i);
			if (spaceMatch) {
				breakdown.space = parseInt(spaceMatch[1], 10);
			}

			// Parse total evaluation
			const totalMatch = line.match(/Total Evaluation\s*:\s*(-?\d+)/i);
			if (totalMatch) {
				breakdown.total = parseInt(totalMatch[1], 10);
			}
		}

		// Return breakdown only if we found at least one component
		return Object.keys(breakdown).length > 0 ? breakdown : undefined;
	}
}


