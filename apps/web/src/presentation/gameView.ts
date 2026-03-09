import type { ReplayData } from "../domain/gameReplay";
import type { GameRecord } from "../domain/types";

export type GameMetaChip = {
  id: string;
  text: string;
};

export type ReplayPositionItem = {
  key: string;
  ply: number;
  analysisPly: number;
  label: string;
  isActive: boolean;
};

export type BoardPresentation = {
  targetFen: string;
  highlightedSquares: string[];
};

export function buildGameMetaChips(game: Pick<GameRecord, "headers">, totalPlies: number): GameMetaChip[] {
  const chips: GameMetaChip[] = [];
  const event = game.headers.Event?.trim();
  const site = game.headers.Site?.trim();
  const date = game.headers.Date?.trim();
  const result = game.headers.Result?.trim();
  const eco = game.headers.ECO?.trim();

  if (event) {
    chips.push({ id: "event", text: event });
  }

  if (site && site !== "?") {
    chips.push({ id: "site", text: site });
  }

  if (date && !date.includes("?")) {
    chips.push({ id: "date", text: date });
  }

  if (result && result !== "*") {
    chips.push({ id: "result", text: result });
  }

  if (eco) {
    chips.push({ id: "eco", text: `ECO ${eco}` });
  }

  chips.push({ id: "plies", text: `${totalPlies} plies` });
  return chips;
}

export function buildReplayPositionItems(replayData: ReplayData, currentPly: number, manualFen: string | null): ReplayPositionItem[] {
  const items: ReplayPositionItem[] = [];

  replayData.moves.forEach((move, index) => {
    const ply = index + 1;
    items.push({
      key: `ply-${ply}-${move.san}`,
      ply,
      analysisPly: index,
      label: `${Math.floor(index / 2) + 1}${index % 2 === 0 ? "." : "..."} ${move.san}`,
      isActive: manualFen === null && currentPly === ply
    });
  });

  return items;
}

export function resolveBoardPresentation(
  replayData: ReplayData | null,
  currentPly: number,
  manualFen: string | null
): BoardPresentation | null {
  if (!replayData) {
    return null;
  }

  const targetFen = manualFen ?? replayData.fenPositions[currentPly] ?? replayData.fenPositions[0];
  if (!targetFen) {
    return null;
  }

  const highlightedMove = manualFen === null && currentPly > 0 ? replayData.moves[currentPly - 1] : null;
  return {
    targetFen,
    highlightedSquares: highlightedMove ? [highlightedMove.from, highlightedMove.to] : []
  };
}
