"use strict";
/**
 * Type definitions for Stockfish companion service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisRequestSchema = void 0;
const zod_1 = require("zod");
/**
 * Analysis request schema
 */
exports.AnalysisRequestSchema = zod_1.z.object({
    fen: zod_1.z.string().optional(),
    moves: zod_1.z.array(zod_1.z.string()).optional(),
    depth: zod_1.z.number().int().min(1).max(30).default(14),
    multiPV: zod_1.z.number().int().min(1).max(10).default(1),
    movetimeMs: zod_1.z.number().int().min(0).default(0),
});
//# sourceMappingURL=types.js.map