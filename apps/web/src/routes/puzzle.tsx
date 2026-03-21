import { useParams } from "@tanstack/react-router";
import { useGame, usePuzzleDetails } from "../lib/runtimeGateway";
import { PuzzleTrainer } from "../presentation/PuzzleTrainer";

export function PuzzlePage() {
  const { puzzleId } = useParams({ from: "/puzzles/$puzzleId" });
  const puzzleData = usePuzzleDetails(puzzleId);
  const puzzle = puzzleData?.puzzle ?? null;
  const game = useGame(puzzle?.gameId ?? "");

  if (puzzleData === undefined) {
    return <section className="page"><p>Loading puzzle...</p></section>;
  }

  if (!puzzle) {
    return <section className="page"><p>Puzzle not found.</p></section>;
  }

  return (
    <section className="page">
      <h2>{puzzle.classification.toUpperCase()} puzzle</h2>
      <p className="muted">Difficulty {puzzle.difficulty}/5</p>
      <PuzzleTrainer
        puzzle={puzzle}
        game={game ?? null}
        attempts={puzzleData.attempts}
        stats={puzzleData.stats}
      />
    </section>
  );
}
