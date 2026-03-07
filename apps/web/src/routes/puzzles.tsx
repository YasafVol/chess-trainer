import { Link } from "@tanstack/react-router";
import type { GameRecord, Puzzle } from "../domain/types";
import { buildReplayData } from "../domain/gameReplay";
import { useLocalGames, useLocalPuzzles } from "../lib/mockData";

function sideLabel(sideToMove: Puzzle["sideToMove"]): string {
  return sideToMove === "w" ? "White to move" : "Black to move";
}

function moveLabel(index: number, san: string): string {
  return `${Math.floor(index / 2) + 1}${index % 2 === 0 ? "." : "..."} ${san}`;
}

export function PuzzlesPage() {
  const puzzles = useLocalPuzzles();
  const games = useLocalGames();

  if (puzzles === undefined || games === undefined) {
    return <section className="page"><p>Loading puzzles…</p></section>;
  }

  const rows: Puzzle[] = puzzles;
  const gameMap = new Map<string, GameRecord>(games.map((game) => [game.id, game]));
  const replayMap = new Map<string, ReturnType<typeof buildReplayData>>();

  function getReplay(gameId: string) {
    if (replayMap.has(gameId)) {
      return replayMap.get(gameId) ?? null;
    }

    const game = gameMap.get(gameId);
    if (!game) {
      replayMap.set(gameId, null as never);
      return null;
    }

    try {
      const replay = buildReplayData(game.pgn, game.initialFen);
      replayMap.set(gameId, replay);
      return replay;
    } catch {
      replayMap.set(gameId, null as never);
      return null;
    }
  }

  function renderBank(title: string, bankRows: Puzzle[]) {
    return (
      <section className="stack-gap">
        <div>
          <h3>{title}</h3>
          <p className="muted">{bankRows.length} puzzle{bankRows.length === 1 ? "" : "s"}</p>
        </div>
        {bankRows.length === 0 ? <p className="muted">No puzzles in this bank yet.</p> : null}
        <ul className="list card-list">
          {bankRows.map((puzzle) => {
            const replay = getReplay(puzzle.gameId);
            const lastMove = puzzle.source.ply > 0 ? replay?.moves[puzzle.source.ply - 1] : null;
            return (
              <li key={puzzle.id} className="card-row">
                <div>
                  <strong>{puzzle.classification.toUpperCase()}</strong>
                  <p className="muted">{sideLabel(puzzle.sideToMove)} · Due {new Date(puzzle.schedule.dueAt).toLocaleString()}</p>
                  <p className="muted">{lastMove ? `After ${moveLabel(puzzle.source.ply - 1, lastMove.san)}` : "From the starting position"}</p>
                  <p className="muted">Difficulty {puzzle.difficulty}/5 · {puzzle.themes.join(", ")}</p>
                </div>
                <Link to="/puzzles/$puzzleId" params={{ puzzleId: puzzle.id }}>Solve</Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  const blunders = rows.filter((puzzle) => puzzle.classification === "blunder");
  const mistakes = rows.filter((puzzle) => puzzle.classification === "mistake");

  return (
    <section className="page stack-gap">
      <div>
        <h2>Puzzles</h2>
        <p className="muted">Puzzles are generated automatically from analyzed domain-level mistakes and blunders, then ordered by due date and failures.</p>
      </div>
      {rows.length === 0 ? <p className="muted">No puzzles generated yet. Analyze a game to create some.</p> : null}
      {renderBank("Blunder bank", blunders)}
      {renderBank("Mistake bank", mistakes)}
    </section>
  );
}
