import type { PlyAnalysis, Puzzle, PuzzleAttempt, PuzzleClassification, PuzzleScheduleState } from "./types";

const DEFAULT_EASE = 2.5;

export function classifyEvalSwing(evalSwing: number): PuzzleClassification | null {
  const abs = Math.abs(evalSwing);
  if (abs >= 200) {
    return "blunder";
  }
  if (abs >= 100) {
    return "mistake";
  }
  if (abs >= 50) {
    return "inaccuracy";
  }
  return null;
}

export function inferThemes(bestLine: string[], playedBadMove?: string): string[] {
  const joined = [playedBadMove ?? "", ...bestLine].join(" ").toLowerCase();
  const themes = new Set<string>();

  if (joined.includes("q") || joined.includes("r")) {
    themes.add("forcing-move");
  }
  if (joined.includes("#")) {
    themes.add("mate");
  }
  if (bestLine.length >= 3) {
    themes.add("calculation");
  }
  if (playedBadMove && bestLine[0] && playedBadMove.slice(0, 2) === bestLine[0].slice(0, 2)) {
    themes.add("candidate-move");
  }

  if (themes.size === 0) {
    themes.add("tactics");
  }

  return Array.from(themes);
}

export function initialPuzzleDifficulty(args: {
  evalSwing: number;
  bestLine: string[];
  evaluationType: "cp" | "mate";
}): number {
  let score = 1;
  const abs = Math.abs(args.evalSwing);

  if (abs >= 300) score += 2;
  else if (abs >= 150) score += 1;

  if (args.bestLine.length >= 4) score += 1;
  if (args.evaluationType === "mate") score += 1;

  return Math.min(5, Math.max(1, score));
}

export function createInitialSchedule(nowIso: string): PuzzleScheduleState {
  return {
    repetition: 0,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE,
    dueAt: nowIso,
    consecutiveFailures: 0
  };
}

export function nextScheduleFromQuality(schedule: PuzzleScheduleState, quality: number, reviewedAtIso: string): PuzzleScheduleState {
  const safeQuality = Math.max(0, Math.min(5, quality));
  let repetition = schedule.repetition;
  let intervalDays = schedule.intervalDays;
  let easeFactor = schedule.easeFactor;
  let consecutiveFailures = schedule.consecutiveFailures;

  if (safeQuality < 3) {
    repetition = 0;
    intervalDays = 1;
    consecutiveFailures += 1;
  } else {
    consecutiveFailures = 0;
    repetition += 1;
    if (repetition === 1) {
      intervalDays = 1;
    } else if (repetition === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - safeQuality) * (0.08 + (5 - safeQuality) * 0.02)));
  const dueAt = new Date(new Date(reviewedAtIso).getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    repetition,
    intervalDays,
    easeFactor,
    dueAt,
    lastReviewedAt: reviewedAtIso,
    consecutiveFailures
  };
}

export function qualityFromAttempt(args: {
  result: "success" | "fail";
  hintsUsed: number;
  revealed: boolean;
  firstTry: boolean;
}): number {
  if (args.revealed || args.result === "fail") {
    return 1;
  }
  if (!args.firstTry || args.hintsUsed > 0) {
    return 3;
  }
  return 5;
}

export function candidatePuzzlePairs(plies: PlyAnalysis[]): Array<{ before: PlyAnalysis; after: PlyAnalysis; evalSwing: number }> {
  const sorted = [...plies].sort((a, b) => a.ply - b.ply);
  const pairs: Array<{ before: PlyAnalysis; after: PlyAnalysis; evalSwing: number }> = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const before = sorted[index];
    const after = sorted[index + 1];

    if (after.ply !== before.ply + 1) {
      continue;
    }

    const evalSwing = after.evaluation - before.evaluation;
    const classification = classifyEvalSwing(evalSwing);
    if (!classification || !before.bestMoveUci) {
      continue;
    }

    pairs.push({ before, after, evalSwing });
  }

  return pairs;
}

export function nextReviewOrder(puzzles: Puzzle[]): Puzzle[] {
  return [...puzzles].sort((a, b) => {
    if (a.schedule.dueAt !== b.schedule.dueAt) {
      return a.schedule.dueAt < b.schedule.dueAt ? -1 : 1;
    }
    if (a.schedule.consecutiveFailures !== b.schedule.consecutiveFailures) {
      return b.schedule.consecutiveFailures - a.schedule.consecutiveFailures;
    }
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
}

export function buildPuzzleStats(puzzle: Puzzle, attempts: PuzzleAttempt[]) {
  const relevant = attempts.filter((attempt) => attempt.puzzleId === puzzle.id);
  const successes = relevant.filter((attempt) => attempt.result === "success").length;
  const failures = relevant.length - successes;
  const firstTrySuccesses = relevant.filter((attempt) => attempt.result === "success" && attempt.quality === 5).length;

  let currentStreak = 0;
  for (let index = relevant.length - 1; index >= 0; index -= 1) {
    if (relevant[index].result !== "success") {
      break;
    }
    currentStreak += 1;
  }

  return {
    attempts: relevant.length,
    successes,
    failures,
    firstTrySuccessRate: relevant.length ? firstTrySuccesses / relevant.length : 0,
    overallSuccessRate: relevant.length ? successes / relevant.length : 0,
    currentStreak,
    nextDueAt: puzzle.schedule.dueAt
  };
}
