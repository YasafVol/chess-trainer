import { extractHeaders, type PgnHeaders } from "./headers";

export type ParsedPgnGame = {
  index: number;
  normalized: string;
  headers: PgnHeaders;
  hasMoves: boolean;
};

export function normalizePgnInput(pgn: string): string {
  if (!pgn) return "";

  let normalized = pgn
    .replace(/\uFEFF/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/^#.*$/gm, "")
    .replace(/\t/g, " ")
    .replace(/;[^\n]*/g, "")
    .replace(/[ \f\v]+/g, " ");

  const headerMatch = normalized.match(/^(\s*\[[^\]]+\]\s*\n)+/m);
  if (headerMatch) {
    const headerBlock = headerMatch[0];
    const rest = normalized.slice(headerBlock.length).replace(/^\s+/, "");
    normalized = `${headerBlock.trimEnd()}\n\n${rest}`;
  }

  return normalized
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function hasMoves(pgn: string): boolean {
  return /\d+\./.test(normalizePgnInput(pgn));
}

export function splitPgnCollection(pgn: string): string[] {
  const normalized = normalizePgnInput(pgn);
  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const games: string[] = [];
  let current: string[] = [];
  let seenMoves = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeader = /^\[[A-Za-z]+\s+".*"\]$/.test(trimmed);
    const isEventHeader = /^\[Event\s+".*"\]$/.test(trimmed);

    if (isEventHeader && current.length > 0 && seenMoves) {
      const candidate = current.join("\n").trim();
      if (candidate) {
        games.push(candidate);
      }
      current = [];
      seenMoves = false;
    }

    if (!isHeader && /\d+\./.test(trimmed)) {
      seenMoves = true;
    }

    current.push(line);
  }

  const trailing = current.join("\n").trim();
  if (trailing) {
    games.push(trailing);
  }

  return games.length > 0 ? games : [normalized];
}

export function parsePgnCollection(pgn: string): ParsedPgnGame[] {
  return splitPgnCollection(pgn)
    .map((game, index) => {
      const normalized = normalizePgnInput(game);
      return {
        index,
        normalized,
        headers: extractHeaders(normalized),
        hasMoves: hasMoves(normalized)
      };
    })
    .filter((game) => game.normalized.length > 0);
}
