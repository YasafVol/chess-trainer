import type { PlyAnalysis } from "../domain/types.js";

const MAX_ABS_CP = 600;
const MATE_CP_EQUIVALENT = 100_000;
const GRAPH_TOP_PADDING = 8;
const GRAPH_HEIGHT = 84;

export type EvalBarState = {
  hasData: boolean;
  normalized: number;
  markerPercent: number;
  fillPercent: number;
  fillTopPercent: number;
  fillSide: "white" | "black" | "neutral";
  scoreText: string;
};

export type EvalGraphPoint = {
  ply: number;
  x: number;
  y: number;
  scoreText: string;
  isSelected: boolean;
};

export type EvalGraphState = {
  points: EvalGraphPoint[];
  path: string;
  selectedPoint: EvalGraphPoint | null;
};

export type MoveAnnotation = {
  suffix: "" | "!" | "?!" | "?" | "??";
  label: string | null;
  lossCp: number | null;
};

type EvalSnapshot = Pick<
  PlyAnalysis,
  | "ply"
  | "evaluationType"
  | "evaluation"
  | "bestMoveUci"
  | "playedMoveUci"
  | "playedMoveEvaluationType"
  | "playedMoveEvaluation"
>;

export function formatEval(type: "cp" | "mate", evaluation: number): string {
  if (type === "mate") {
    return `M${evaluation > 0 ? "+" : ""}${evaluation}`;
  }
  const cp = evaluation / 100;
  return `${cp >= 0 ? "+" : ""}${cp.toFixed(2)}`;
}

export function normalizeEval(type: "cp" | "mate", evaluation: number): number {
  if (type === "mate") {
    if (evaluation === 0) {
      return 0;
    }
    return evaluation > 0 ? 1 : -1;
  }
  return Math.max(-1, Math.min(1, evaluation / MAX_ABS_CP));
}

function evaluationToComparableCp(type: "cp" | "mate", evaluation: number): number {
  if (type === "cp") {
    return evaluation;
  }
  if (evaluation === 0) {
    return 0;
  }
  return evaluation > 0 ? MATE_CP_EQUIVALENT : -MATE_CP_EQUIVALENT;
}

export function buildEvalBarState(ply: EvalSnapshot | undefined): EvalBarState {
  if (!ply) {
    return {
      hasData: false,
      normalized: 0,
      markerPercent: 50,
      fillPercent: 0,
      fillTopPercent: 50,
      fillSide: "neutral",
      scoreText: "n/a"
    };
  }

  const normalized = normalizeEval(ply.evaluationType, ply.evaluation);
  const fillPercent = Math.abs(normalized) * 50;

  return {
    hasData: true,
    normalized,
    markerPercent: 50 - normalized * 50,
    fillPercent,
    fillTopPercent: normalized >= 0 ? 50 - fillPercent : 50,
    fillSide: normalized > 0 ? "white" : normalized < 0 ? "black" : "neutral",
    scoreText: formatEval(ply.evaluationType, ply.evaluation)
  };
}

export function buildEvalGraphState(plies: EvalSnapshot[], currentPly: number): EvalGraphState {
  if (plies.length === 0) {
    return {
      points: [],
      path: "",
      selectedPoint: null
    };
  }

  const byPly = new Map<number, EvalSnapshot>();
  for (const ply of plies) {
    byPly.set(ply.ply, ply);
  }

  const sorted = Array.from(byPly.values()).sort((a, b) => a.ply - b.ply);
  const maxPly = sorted[sorted.length - 1]?.ply ?? 0;

  const points = sorted.map((ply) => {
    const normalized = normalizeEval(ply.evaluationType, ply.evaluation);
    const x = maxPly === 0 ? 50 : (ply.ply / maxPly) * 100;
    const y = GRAPH_TOP_PADDING + (1 - (normalized + 1) / 2) * GRAPH_HEIGHT;

    return {
      ply: ply.ply,
      x,
      y,
      scoreText: formatEval(ply.evaluationType, ply.evaluation),
      isSelected: ply.ply === currentPly
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return {
    points,
    path,
    selectedPoint: points.find((point) => point.isSelected) ?? null
  };
}

export function buildMoveAnnotation(ply: EvalSnapshot | undefined): MoveAnnotation {
  if (!ply || ply.playedMoveEvaluationType === undefined || ply.playedMoveEvaluation === undefined) {
    return {
      suffix: "",
      label: null,
      lossCp: null
    };
  }

  if (ply.playedMoveUci && ply.bestMoveUci && ply.playedMoveUci === ply.bestMoveUci) {
    return {
      suffix: "!",
      label: "Best move",
      lossCp: 0
    };
  }

  const bestComparable = evaluationToComparableCp(ply.evaluationType, ply.evaluation);
  const playedComparable = evaluationToComparableCp(ply.playedMoveEvaluationType, ply.playedMoveEvaluation);
  const lossCp = Math.max(0, bestComparable - playedComparable);

  if (lossCp >= 200) {
    return { suffix: "??", label: "Blunder", lossCp };
  }
  if (lossCp >= 100) {
    return { suffix: "?", label: "Mistake", lossCp };
  }
  if (lossCp >= 50) {
    return { suffix: "?!", label: "Inaccuracy", lossCp };
  }

  return {
    suffix: "",
    label: null,
    lossCp
  };
}
