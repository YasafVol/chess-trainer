import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { GameRecord } from "../domain/types";
import { listGames } from "../lib/storage/repositories/gamesRepo";

export function LibraryPage() {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listGames()
      .then(setGames)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load games."));
  }, []);

  return (
    <section className="page">
      <h2>Library</h2>
      {error ? <p>{error}</p> : null}
      {games.length === 0 ? <p className="muted">No games saved yet.</p> : null}
      <ul className="list">
        {games.map((game) => (
          <li key={game.id} style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
            <Link to="/game/$gameId" params={{ gameId: game.id }}>
              {game.headers.White ?? "White"} vs {game.headers.Black ?? "Black"} ({game.hash})
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
