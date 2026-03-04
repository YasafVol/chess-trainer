import { Chess } from "chess.js";
export function buildReplayData(pgn, initialFen) {
    const parser = initialFen && initialFen !== "startpos" ? new Chess(initialFen) : new Chess();
    parser.loadPgn(pgn, { strict: false });
    const verboseMoves = parser.history({ verbose: true });
    const replay = initialFen && initialFen !== "startpos" ? new Chess(initialFen) : new Chess();
    const fenPositions = [replay.fen()];
    const moves = [];
    for (const move of verboseMoves) {
        replay.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion
        });
        fenPositions.push(replay.fen());
        moves.push({
            san: move.san,
            from: move.from,
            to: move.to,
            promotion: move.promotion
        });
    }
    return { moves, fenPositions };
}
export function moveToUci(move) {
    return `${move.from}${move.to}${move.promotion ?? ""}`;
}
