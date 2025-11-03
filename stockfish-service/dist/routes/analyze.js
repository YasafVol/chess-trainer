"use strict";
/**
 * Analysis endpoint
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeHandler = analyzeHandler;
const types_1 = require("../types");
const UciParser_1 = require("../engine/UciParser");
async function analyzeHandler(req, res, stockfishProcess) {
    try {
        // Validate request
        const validationResult = types_1.AnalysisRequestSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errorResponse = {
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
        const analysis = UciParser_1.UciParser.parseAnalysis(output, timingMs);
        // Return response
        res.json(analysis);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Check for timeout
        if (errorMessage.includes('Timeout') || errorMessage.includes('time limit')) {
            res.status(504).json({
                error: 'timeout',
                message: `Analysis exceeded time limit (depth=${req.body.depth || 14}).`,
            });
            return;
        }
        // Generic error
        res.status(500).json({
            error: 'analysis_error',
            message: errorMessage,
        });
    }
}
//# sourceMappingURL=analyze.js.map