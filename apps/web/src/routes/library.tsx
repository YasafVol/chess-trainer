import { Link } from "@tanstack/react-router";
import type { GameRecord } from "../domain/types";
import { useLocalGames } from "../lib/mockData";

export function LibraryPage() {
  const games = useLocalGames();

  if (games === undefined) {
    return <section className="page"><p>Loading library…</p></section>;
  }

  const rows: GameRecord[] = games;

  return (
    <section className="page">
      <h2>Library</h2>
      {rows.length === 0 ? <p className="muted">No games saved yet.</p> : null}
      <ul className="list card-list">
        {rows.map((game) => (
          <li key={game.id} className="card-row">
            <div>
              <strong>{game.headers.White ?? "White"} vs {game.headers.Black ?? "Black"}</strong>
              <p className="muted">{game.headers.Event ?? "Unknown event"} · {game.hash}</p>
            </div>
            <div className="inline-actions">
              <Link to="/game/$gameId" params={{ gameId: game.id }}>Open game</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
