"use strict";
/**
 * Stockfish Companion Service
 * HTTP API wrapper for Stockfish chess engine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const StockfishProcess_1 = require("./engine/StockfishProcess");
const health_1 = require("./routes/health");
const analyze_1 = require("./routes/analyze");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 9898;
const STOCKFISH_PATH = process.env.STOCKFISH_PATH || 'stockfish';
const ENGINE_THREADS = process.env.ENGINE_THREADS ? parseInt(process.env.ENGINE_THREADS, 10) : 1;
const ENGINE_HASH = process.env.ENGINE_HASH ? parseInt(process.env.ENGINE_HASH, 10) : 128;
// Initialize Stockfish process
const stockfishProcess = new StockfishProcess_1.StockfishProcess(STOCKFISH_PATH, ENGINE_THREADS, ENGINE_HASH);
// Middleware
app.use(express_1.default.json());
// CORS headers for Obsidian desktop (app:// origin)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
// Health check endpoint
app.get('/health', async (req, res) => {
    await (0, health_1.healthHandler)(req, res, stockfishProcess);
});
// Analysis endpoint
app.post('/analyze', async (req, res) => {
    await (0, analyze_1.analyzeHandler)(req, res, stockfishProcess);
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Stockfish Companion Service',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            analyze: 'POST /analyze',
        },
    });
});
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    stockfishProcess.terminate();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    stockfishProcess.terminate();
    process.exit(0);
});
// Start server
async function start() {
    try {
        // Initialize Stockfish on startup
        console.log('Initializing Stockfish engine...');
        await stockfishProcess.initialize();
        console.log('Stockfish engine ready');
        app.listen(PORT, () => {
            console.log(`Stockfish Companion Service listening on port ${PORT}`);
            console.log(`Stockfish path: ${STOCKFISH_PATH}`);
            console.log(`Engine threads: ${ENGINE_THREADS}, Hash: ${ENGINE_HASH} MB`);
        });
    }
    catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map