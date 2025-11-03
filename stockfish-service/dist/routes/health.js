"use strict";
/**
 * Health check endpoint
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthHandler = healthHandler;
async function healthHandler(req, res, stockfishProcess) {
    try {
        const isReady = stockfishProcess.checkReady();
        if (!isReady) {
            // Try to initialize
            try {
                await stockfishProcess.initialize();
                const version = await stockfishProcess.getVersion();
                res.json({
                    status: 'healthy',
                    engine: 'ready',
                    version,
                });
            }
            catch (error) {
                res.status(503).json({
                    status: 'unhealthy',
                    engine: 'not ready',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        else {
            const version = await stockfishProcess.getVersion();
            res.json({
                status: 'healthy',
                engine: 'ready',
                version,
            });
        }
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=health.js.map