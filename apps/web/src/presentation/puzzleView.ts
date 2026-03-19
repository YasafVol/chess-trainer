import { Chess, type Square } from "chess.js";
import type { ReplayData } from "../domain/gameReplay";
import type { Puzzle } from "../domain/types";

export type PuzzleTab = "blunder" | "mistake";
export type PuzzleDifficultyFilter = "all" | 1 | 2 | 3 | 4 | 5;
export type PuzzleOwnershipFilter = "all" | "mine" | "other";

export function filterPuzzles(
  rows: Puzzle[],
  tab: PuzzleTab,
  ownership: PuzzleOwnershipFilter,
  difficulty: PuzzleDifficultyFilter
): Puzzle[] {
  return rows.filter((puzzle) => {
    if (puzzle.classification !== tab) {
      return false;
    }

    if (ownership !== "all" && puzzle.ownership !== ownership) {
      return false;
    }

    if (difficulty === "all") {
      return true;
    }

    return puzzle.difficulty === difficulty;
  });
}

export function formatIndexedMove(index: number, san: string): string {
  return `${Math.floor(index / 2) + 1}${index % 2 === 0 ? "." : "..."} ${san}`;
}

export function resolveOriginalBlunderLabel(
  puzzle: Pick<Puzzle, "source" | "playedBadMove">,
  replayData: ReplayData | null
): string | null {
  const originalMove = replayData?.moves[puzzle.source.ply] ?? null;
  if (originalMove) {
    return formatIndexedMove(puzzle.source.ply, originalMove.san);
  }

  return puzzle.playedBadMove ?? null;
}

export function buildPuzzlePlaybackFens(fen: string, solutionMoves: string[]): string[] {
  const chess = new Chess(fen);
  const frames: string[] = [];

  for (const move of solutionMoves) {
    const result = chess.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: move.length > 4 ? move.slice(4) : undefined
    });

    if (!result) {
      throw new Error(`Invalid puzzle solution move: ${move}`);
    }

    frames.push(chess.fen());
  }

  return frames;
}

export function buildRevealPlaybackMoves(solutionMoves: string[]): string[] {
  return solutionMoves.slice(0, 1);
}

export function buildSolveContinuationMoves(solutionMoves: string[]): string[] {
  return solutionMoves.slice(1);
}

function pieceLabel(type: string | undefined): string {
  switch (type) {
    case "p":
      return "pawn";
    case "n":
      return "knight";
    case "b":
      return "bishop";
    case "r":
      return "rook";
    case "q":
      return "queen";
    case "k":
      return "king";
    default:
      return "piece";
  }
}

export function describePuzzleHint(fen: string, solutionMove: string): string {
  const square = solutionMove.slice(0, 2);
  if (!/^[a-h][1-8]$/.test(square)) {
    return "Hint unavailable for this puzzle.";
  }

  try {
    const chess = new Chess(fen);
    const piece = chess.get(square as Square);
    return `Hint: look at the ${pieceLabel(piece?.type)} on ${square}.`;
  } catch {
    return `Hint: look at the piece on ${square}.`;
  }
}
