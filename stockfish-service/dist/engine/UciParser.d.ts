/**
 * UCI Protocol Parser
 * Parses Stockfish UCI output into structured analysis results
 */
import { AnalysisResponse } from '../types';
export declare class UciParser {
    /**
     * Parse UCI analysis output into AnalysisResponse
     */
    static parseAnalysis(output: string, timingMs: number): AnalysisResponse;
}
//# sourceMappingURL=UciParser.d.ts.map