import { useNavigate } from "@tanstack/react-router";
import type { GameRecord } from "../domain/types";
import { useLocalGames } from "../lib/mockData";

function readHeader(headers: Record<string, string>, key: string): string | null {
  const value = headers[key]?.trim();
  if (!value || value === "?" || value === "????.??.??") {
    return null;
  }
  return value;
}

function winnerLabel(game: GameRecord): string {
  const white = readHeader(game.headers, "White") ?? "White";
  const black = readHeader(game.headers, "Black") ?? "Black";
  const result = readHeader(game.headers, "Result");

  if (result === "1-0") return white + " won";
  if (result === "0-1") return black + " won";
  if (result === "1/2-1/2") return "Draw";
  return "Result unknown";
}

function formatRating(game: GameRecord): string | null {
  const whiteElo = readHeader(game.headers, "WhiteElo");
  const blackElo = readHeader(game.headers, "BlackElo");
  if (!whiteElo && !blackElo) {
    return null;
  }
  return `Elo ${whiteElo ?? "?"} vs ${blackElo ?? "?"}`;
}

function formatGameDate(game: GameRecord): string | null {
  const rawDate = readHeader(game.headers, "Date");
  if (!rawDate) {
    return null;
  }

  const match = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(rawDate);
  if (!match) {
    return rawDate;
  }

  const [, year, month, day] = match;
  if (month === "??" || day === "??") {
    return year;
  }

  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(parsed.getTime())) {
    return rawDate;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(parsed);
}

function formatClock(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (remainder === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainder}s`;
}

function classifyTimeControl(baseSeconds: number, incrementSeconds: number): string {
  const effectiveSeconds = baseSeconds + incrementSeconds * 40;
  if (effectiveSeconds < 180) return "Bullet";
  if (effectiveSeconds < 600) return "Blitz";
  if (effectiveSeconds < 1800) return "Rapid";
  return "Classical";
}

function formatTimeControl(game: GameRecord): string | null {
  const raw = readHeader(game.headers, "TimeControl");
  if (!raw) {
    return null;
  }

  if (raw === "-") {
    return "Untimed";
  }

  const simple = /^(\d+)(?:\+(\d+))?$/.exec(raw);
  if (simple) {
    const baseSeconds = Number(simple[1]);
    const incrementSeconds = Number(simple[2] ?? "0");
    const category = classifyTimeControl(baseSeconds, incrementSeconds);
    const clock = incrementSeconds > 0
      ? `${formatClock(baseSeconds)} + ${incrementSeconds}s`
      : formatClock(baseSeconds);
    return `${category} · ${clock}`;
  }

  return raw;
}

export function LibraryPage() {
  const games = useLocalGames();
  const navigate = useNavigate();

  if (games === undefined) {
    return <section className="page"><p>Loading library…</p></section>;
  }

  const rows: GameRecord[] = games;

  return (
    <section className="page">
      <h2>Library</h2>
      {rows.length === 0 ? <p className="muted">No games saved yet.</p> : null}
      <ul className="list card-list">
        {rows.map((game) => {
          const white = readHeader(game.headers, "White") ?? "White";
          const black = readHeader(game.headers, "Black") ?? "Black";
          const event = readHeader(game.headers, "Event") ?? "Unknown event";
          const rating = formatRating(game);
          const playedOn = formatGameDate(game);
          const timeControl = formatTimeControl(game);
          const outcome = winnerLabel(game);

          return (
            <li key={game.id}>
              <button
                type="button"
                className="library-card-button"
                onClick={() => {
                  void navigate({ to: "/game/$gameId", params: { gameId: game.id } });
                }}
              >
                <div className="library-card-head">
                  <div>
                    <strong>{white} vs {black}</strong>
                    <p className="muted">{event} · {game.hash}</p>
                  </div>
                  <span className="library-card-open">Open</span>
                </div>
                <div className="library-card-meta">
                  <span>{outcome}</span>
                  {rating ? <span>{rating}</span> : null}
                  {playedOn ? <span>{playedOn}</span> : null}
                  {timeControl ? <span>{timeControl}</span> : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
