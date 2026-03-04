import { Chess } from "chess.js";

export type ReplayMove = {
  san: string;
  from: string;
  to: string;
  promotion?: string;
};

export type ReplayData = {
  moves: ReplayMove[];
  fenPositions: string[];
};

export function buildReplayData(pgn: string, initialFen: string): ReplayData {
  const parser = initialFen && initialFen !== "startpos" ? new Chess(initialFen) : new Chess();
  parser.loadPgn(pgn, { strict: false });

  const verboseMoves = parser.history({ verbose: true }) as Array<{
    san: string;
    from: string;
    to: string;
    promotion?: string;
  }>;

  const replay = initialFen && initialFen !== "startpos" ? new Chess(initialFen) : new Chess();
  const fenPositions: string[] = [replay.fen()];
  const moves: ReplayMove[] = [];

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

export function moveToUci(move: ReplayMove): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}
