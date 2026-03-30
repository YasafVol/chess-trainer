import { useParams } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useGame, usePuzzleDetails } from "../lib/runtimeGateway";
import { PuzzleTrainer } from "../presentation/PuzzleTrainer";

export function PuzzlePage() {
  const { puzzleId } = useParams({ from: "/puzzles/$puzzleId" });
  const puzzleData = usePuzzleDetails(puzzleId);
  const puzzle = puzzleData?.puzzle ?? null;
  const game = useGame(puzzle?.gameId ?? "");

  if (puzzleData === undefined) {
    return <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"><p className="text-muted-foreground">Loading puzzle...</p></section>;
  }

  if (!puzzle) {
    return <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"><p className="text-muted-foreground">Puzzle not found.</p></section>;
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{puzzle.classification.toUpperCase()} puzzle</h2>
        <Badge variant="secondary">Difficulty {puzzle.difficulty}/5</Badge>
      </div>
      <PuzzleTrainer
        puzzle={puzzle}
        game={game ?? null}
        attempts={puzzleData.attempts}
        stats={puzzleData.stats}
      />
    </section>
  );
}
