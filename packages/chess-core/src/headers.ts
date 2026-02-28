export type PgnHeaders = Record<string, string>;

export function extractHeaders(pgn: string): PgnHeaders {
  const headers: PgnHeaders = {};
  const regex = /^\[([A-Za-z]+)\s+"([^"]*)"\]$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(pgn)) !== null) {
    const [, key, value] = match;
    headers[key] = value;
  }
  return headers;
}
