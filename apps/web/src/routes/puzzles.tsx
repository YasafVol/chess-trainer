import { Link } from "@tanstack/react-router";
import type { Puzzle } from "../domain/types";
import { useLocalPuzzles } from "../lib/mockData";

export function PuzzlesPage() {
  const puzzles = useLocalPuzzles();

  if (puzzles === undefined) {
    return <section className="page"><p>Loading puzzles…</p></section>;
  }

  const rows: Puzzle[] = puzzles;

  return (
    <section className="page">
      <h2>Puzzles</h2>
      <p className="muted">Puzzles are generated automatically from analyzed mistakes and blunders, then ordered by due date and failures.</p>
      {rows.length === 0 ? <p className="muted">No puzzles generated yet. Analyze a game to create some.</p> : null}
      <ul className="list card-list">
        {rows.map((puzzle) => (
          <li key={puzzle.id} className="card-row">
            <div>
              <strong>{puzzle.classification.toUpperCase()}</strong>
              <p className="muted">Due {new Date(puzzle.schedule.dueAt).toLocaleString()} · Difficulty {puzzle.difficulty}/5</p>
              <p className="muted">{puzzle.themes.join(", ")}</p>
            </div>
            <Link to="/puzzles/$puzzleId" params={{ puzzleId: puzzle.id }}>Solve</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
