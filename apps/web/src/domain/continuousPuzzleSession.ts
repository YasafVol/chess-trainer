import { buildPuzzleStats } from "./puzzles.js";
import type { Puzzle, PuzzleAttempt } from "./types.js";

export type ContinuousPuzzlePhase = "blunder" | "mistake";

export type ContinuousPuzzleQueue = Record<ContinuousPuzzlePhase, string[]>;

export type ContinuousPuzzleCandidateRank = {
  puzzleId: string;
  phase: ContinuousPuzzlePhase;
  isDue: boolean;
  consecutiveFailures: number;
  overallSuccessRate: number;
  attemptCount: number;
  difficulty: number;
  evalSwingMagnitude: number;
  dueAt: string;
  updatedAt: string;
};

function isContinuousPhase(value: Puzzle["classification"]): value is ContinuousPuzzlePhase {
  return value === "blunder" || value === "mistake";
}

function attemptsForPuzzle(puzzleId: string, attempts: PuzzleAttempt[]): PuzzleAttempt[] {
  return attempts.filter((attempt) => attempt.puzzleId === puzzleId);
}

export function rankContinuousPuzzleCandidate(
  puzzle: Puzzle,
  attempts: PuzzleAttempt[],
  nowIso: string
): ContinuousPuzzleCandidateRank {
  const stats = buildPuzzleStats(puzzle, attemptsForPuzzle(puzzle.id, attempts));
  return {
    puzzleId: puzzle.id,
    phase: puzzle.classification === "mistake" ? "mistake" : "blunder",
    isDue: puzzle.schedule.dueAt <= nowIso,
    consecutiveFailures: puzzle.schedule.consecutiveFailures,
    overallSuccessRate: stats.attempts === 0 ? 0.5 : stats.overallSuccessRate,
    attemptCount: stats.attempts,
    difficulty: puzzle.difficulty,
    evalSwingMagnitude: Math.abs(puzzle.evalSwing),
    dueAt: puzzle.schedule.dueAt,
    updatedAt: puzzle.updatedAt
  };
}

function compareContinuousCandidates(a: ContinuousPuzzleCandidateRank, b: ContinuousPuzzleCandidateRank): number {
  if (a.consecutiveFailures !== b.consecutiveFailures) {
    return b.consecutiveFailures - a.consecutiveFailures;
  }
  if (a.overallSuccessRate !== b.overallSuccessRate) {
    return a.overallSuccessRate - b.overallSuccessRate;
  }
  if (a.attemptCount !== b.attemptCount) {
    return a.attemptCount - b.attemptCount;
  }
  if (a.difficulty !== b.difficulty) {
    return b.difficulty - a.difficulty;
  }
  if (a.evalSwingMagnitude !== b.evalSwingMagnitude) {
    return b.evalSwingMagnitude - a.evalSwingMagnitude;
  }
  if (a.dueAt !== b.dueAt) {
    return a.dueAt < b.dueAt ? -1 : 1;
  }
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt < b.updatedAt ? -1 : 1;
  }
  return a.puzzleId.localeCompare(b.puzzleId);
}

function sortPhaseQueue(puzzles: Puzzle[], attempts: PuzzleAttempt[], nowIso: string): string[] {
  const ranked = puzzles.map((puzzle) => rankContinuousPuzzleCandidate(puzzle, attempts, nowIso));
  const due = ranked.filter((candidate) => candidate.isDue).sort(compareContinuousCandidates);
  const later = ranked.filter((candidate) => !candidate.isDue).sort(compareContinuousCandidates);
  return [...due, ...later].map((candidate) => candidate.puzzleId);
}

export function buildContinuousPuzzleQueue(
  puzzles: Puzzle[],
  attempts: PuzzleAttempt[],
  nowIso: string
): ContinuousPuzzleQueue {
  const eligible = puzzles.filter((puzzle) => puzzle.ownership === "mine" && isContinuousPhase(puzzle.classification));
  return {
    blunder: sortPhaseQueue(
      eligible.filter((puzzle) => puzzle.classification === "blunder"),
      attempts,
      nowIso
    ),
    mistake: sortPhaseQueue(
      eligible.filter((puzzle) => puzzle.classification === "mistake"),
      attempts,
      nowIso
    )
  };
}

export function requeueContinuousPuzzle(queue: string[], puzzleId: string, gapSize: number): string[] {
  const index = queue.indexOf(puzzleId);
  if (index === -1) {
    return [...queue];
  }

  const remaining = queue.filter((candidateId, candidateIndex) => candidateIndex !== index);
  const insertAt = Math.min(Math.max(0, gapSize), remaining.length);
  return [
    ...remaining.slice(0, insertAt),
    puzzleId,
    ...remaining.slice(insertAt)
  ];
}

export function removeContinuousPuzzle(queue: string[], puzzleId: string): string[] {
  return queue.filter((candidateId) => candidateId !== puzzleId);
}
