import type { ChessComArchiveMonth } from "./types.js";

const ARCHIVE_URL_REGEX = /\/games\/(\d{4})\/(\d{2})\/?$/;

function monthId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function parseChessComArchiveUrl(url: string): ChessComArchiveMonth | null {
  const match = ARCHIVE_URL_REGEX.exec(url);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    id: monthId(year, month),
    year,
    month,
    url,
    label: monthLabel(year, month)
  };
}

export function compareChessComArchiveMonths(a: Pick<ChessComArchiveMonth, "year" | "month">, b: Pick<ChessComArchiveMonth, "year" | "month">): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  return a.month - b.month;
}

export function sortChessComArchiveMonths(months: ChessComArchiveMonth[]): ChessComArchiveMonth[] {
  return [...months].sort(compareChessComArchiveMonths);
}

export function filterChessComArchiveMonthsInRange(
  months: ChessComArchiveMonth[],
  startMonthId: string,
  endMonthId: string
): ChessComArchiveMonth[] {
  const sorted = sortChessComArchiveMonths(months);
  const startIndex = sorted.findIndex((month) => month.id === startMonthId);
  const endIndex = sorted.findIndex((month) => month.id === endMonthId);

  if (startIndex < 0 || endIndex < 0) {
    throw new Error("Select valid Chess.com archive months before importing.");
  }
  if (startIndex > endIndex) {
    throw new Error("Start month must be earlier than or equal to the end month.");
  }

  return sorted.slice(startIndex, endIndex + 1);
}

export function filterChessComArchiveMonthsAfter(
  months: ChessComArchiveMonth[],
  lastSuccessfulArchive: string | undefined
): ChessComArchiveMonth[] {
  const sorted = sortChessComArchiveMonths(months);
  if (!lastSuccessfulArchive) {
    return sorted;
  }

  return sorted.filter((month) => month.id > lastSuccessfulArchive);
}
