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
