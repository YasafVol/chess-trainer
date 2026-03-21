import { parseChessComArchiveUrl, sortChessComArchiveMonths } from "../domain/chessComArchives.js";
import { normalizeChessComUsername } from "../domain/chessComSyncConfig.js";
import type { ChessComArchiveMonth } from "../domain/types.js";

const CHESS_COM_API_BASE_URL = "https://api.chess.com/pub/player";

async function readResponseText(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    return text.trim().length > 0 ? text : fallback;
  } catch {
    return fallback;
  }
}

export async function fetchChessComArchiveMonths(username: string): Promise<ChessComArchiveMonth[]> {
  const normalizedUsername = normalizeChessComUsername(username);
  if (!normalizedUsername) {
    throw new Error("Chess.com username is required.");
  }

  const response = await fetch(`${CHESS_COM_API_BASE_URL}/${normalizedUsername}/games/archives`);
  if (!response.ok) {
    throw new Error(await readResponseText(response, `Chess.com archive lookup failed (${response.status}).`));
  }

  const body = await response.json() as { archives?: unknown };
  const archives = Array.isArray(body.archives) ? body.archives : [];
  return sortChessComArchiveMonths(
    archives
      .filter((value): value is string => typeof value === "string")
      .map((url) => parseChessComArchiveUrl(url))
      .filter((month): month is ChessComArchiveMonth => month !== null)
  );
}

export async function fetchChessComArchivePgn(username: string, archive: ChessComArchiveMonth): Promise<string> {
  const normalizedUsername = normalizeChessComUsername(username);
  if (!normalizedUsername) {
    throw new Error("Chess.com username is required.");
  }

  const response = await fetch(
    `${CHESS_COM_API_BASE_URL}/${normalizedUsername}/games/${String(archive.year)}/${String(archive.month).padStart(2, "0")}/pgn`
  );
  if (!response.ok) {
    throw new Error(await readResponseText(response, `Chess.com archive PGN download failed (${response.status}).`));
  }

  return response.text();
}
