import { ANALYSIS_POLICY } from "./analysisPolicy.js";

export type AnalysisBenchmarkEngineFlavor = "stockfish-18-lite-single" | "stockfish-18-single" | "stockfish-18";

export const ANALYSIS_BENCHMARK_REPETITIONS = 5;
const ANALYSIS_BENCHMARK_HEADROOM = 1.15;

export type AnalysisBenchmarkScenario = {
  id: string;
  label: string;
  description: string;
  settings: {
    engineFlavor: AnalysisBenchmarkEngineFlavor;
    depth: number;
    movetimeMs: number;
    multiPV: number;
    baseForegroundBudgetMs: number;
    foregroundBudgetPerPlyMs: number;
  };
};

export type AnalysisBenchmarkRepetition = {
  repetition: number;
  engineInitMs: number;
  runMs: number;
  analyzedPlies: number;
  retriesUsed: number;
  stoppedByBudget: boolean;
  finalStatus: "completed" | "cancelled" | "failed";
  error?: string;
  plyTimeMs: number[];
};

export type AnalysisBenchmarkScenarioSummary = {
  runsCompleted: number;
  avgRunMs: number;
  medianRunMs: number;
  p95RunMs: number;
  avgPlyMs: number;
  medianPlyMs: number;
  p95PlyMs: number;
  avgAnalyzedPlies: number;
  avgRetriesPerRun: number;
  budgetStops: number;
  recommendedBudgetMs: number;
  recommendedBudgetPerPlyMs: number;
};

export type AnalysisBenchmarkScenarioResult =
  | {
      status: "completed";
      scenario: AnalysisBenchmarkScenario;
      repetitions: AnalysisBenchmarkRepetition[];
      summary: AnalysisBenchmarkScenarioSummary;
      note?: string;
    }
  | {
      status: "skipped";
      scenario: AnalysisBenchmarkScenario;
      repetitions: AnalysisBenchmarkRepetition[];
      reason: string;
    };

export type AnalysisBenchmarkKnob = {
  key: "engineFlavor" | "depth" | "movetimeMs" | "multiPV" | "baseForegroundBudgetMs" | "foregroundBudgetPerPlyMs";
  label: string;
  value: string;
  help: string;
};

export type AnalysisBenchmarkBlockedKnob = {
  key: "threads" | "hashMb";
  label: string;
  reason: string;
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower] ?? 0;
  }

  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;
  const weight = index - lower;
  return lowerValue + (upperValue - lowerValue) * weight;
}

function roundMetric(value: number): number {
  return Math.round(value);
}

export function buildAnalysisBenchmarkScenarios(
  policy: {
    defaultDepth: number;
    defaultMultiPV: number;
    softPerPositionMaxMs: number;
    baseForegroundBudgetMs: number;
    foregroundBudgetPerPlyMs: number;
  } = ANALYSIS_POLICY
): AnalysisBenchmarkScenario[] {
  const baselineSettings = {
    engineFlavor: "stockfish-18-lite-single" as const,
    depth: policy.defaultDepth,
    movetimeMs: policy.softPerPositionMaxMs,
    multiPV: policy.defaultMultiPV,
    baseForegroundBudgetMs: policy.baseForegroundBudgetMs,
    foregroundBudgetPerPlyMs: policy.foregroundBudgetPerPlyMs
  };

  return [
    {
      id: "baseline",
      label: "Baseline",
      description: "Current shipped lite single-thread profile.",
      settings: baselineSettings
    },
    {
      id: "depth-12",
      label: "Depth 12",
      description: "Lower search depth to compare faster short-game coverage.",
      settings: { ...baselineSettings, depth: 12 }
    },
    {
      id: "depth-18",
      label: "Depth 18",
      description: "Higher search depth to estimate deeper-analysis cost.",
      settings: { ...baselineSettings, depth: 18 }
    },
    {
      id: "movetime-800",
      label: "Movetime 800ms",
      description: "Tighter per-position cap to test faster turnarounds.",
      settings: { ...baselineSettings, movetimeMs: 800 }
    },
    {
      id: "movetime-1600",
      label: "Movetime 1600ms",
      description: "Looser per-position cap to compare stronger but slower runs.",
      settings: { ...baselineSettings, movetimeMs: 1600 }
    },
    {
      id: "multipv-2",
      label: "MultiPV 2",
      description: "Request two lines and observe the cost increase over baseline.",
      settings: { ...baselineSettings, multiPV: 2 }
    },
    {
      id: "engine-single",
      label: "Single Engine",
      description: "Use the heavier single-thread engine build if it initializes successfully.",
      settings: { ...baselineSettings, engineFlavor: "stockfish-18-single" }
    }
  ];
}

export function buildAnalysisBenchmarkKnobs(
  policy: {
    defaultDepth: number;
    defaultMultiPV: number;
    softPerPositionMaxMs: number;
    baseForegroundBudgetMs: number;
    foregroundBudgetPerPlyMs: number;
  } = ANALYSIS_POLICY
): AnalysisBenchmarkKnob[] {
  return [
    {
      key: "engineFlavor",
      label: "Engine flavor",
      value: "stockfish-18-lite-single (baseline), stockfish-18-single (comparison)",
      help: "Worker engine asset bundle used for the run."
    },
    {
      key: "depth",
      label: "Depth",
      value: String(policy.defaultDepth),
      help: "Default depth applied to this short game benchmark."
    },
    {
      key: "movetimeMs",
      label: "Per-position movetime",
      value: `${policy.softPerPositionMaxMs}ms`,
      help: "Soft cap passed to Stockfish for each engine request."
    },
    {
      key: "multiPV",
      label: "MultiPV",
      value: String(policy.defaultMultiPV),
      help: "Number of lines requested from Stockfish."
    },
    {
      key: "baseForegroundBudgetMs",
      label: "Base foreground budget",
      value: `${policy.baseForegroundBudgetMs}ms`,
      help: "Minimum run budget before per-ply scaling is applied."
    },
    {
      key: "foregroundBudgetPerPlyMs",
      label: "Foreground budget per ply",
      value: `${policy.foregroundBudgetPerPlyMs}ms`,
      help: "Additional foreground runtime budget granted per ply."
    }
  ];
}

export function listBlockedAnalysisBenchmarkKnobs(): AnalysisBenchmarkBlockedKnob[] {
  return [
    {
      key: "threads",
      label: "Threads",
      reason: "The worker currently hardcodes `Threads` to 1 for every engine request."
    },
    {
      key: "hashMb",
      label: "Hash",
      reason: "The worker does not set the Stockfish `Hash` option yet."
    }
  ];
}

export function summarizeAnalysisBenchmarkScenario(args: {
  totalPlies: number;
  repetitions: AnalysisBenchmarkRepetition[];
}): AnalysisBenchmarkScenarioSummary {
  const runMs = args.repetitions.map((repetition) => repetition.runMs);
  const plyMs = args.repetitions.flatMap((repetition) => repetition.plyTimeMs);
  const analyzedPlies = args.repetitions.map((repetition) => repetition.analyzedPlies);
  const retries = args.repetitions.map((repetition) => repetition.retriesUsed);
  const budgetStops = args.repetitions.filter((repetition) => repetition.stoppedByBudget).length;
  const p95RunMs = percentile(runMs, 0.95);
  const recommendedBudgetMs = Math.ceil(p95RunMs * ANALYSIS_BENCHMARK_HEADROOM);
  const effectivePlies = Math.max(1, args.totalPlies);

  return {
    runsCompleted: args.repetitions.length,
    avgRunMs: roundMetric(average(runMs)),
    medianRunMs: roundMetric(percentile(runMs, 0.5)),
    p95RunMs: roundMetric(p95RunMs),
    avgPlyMs: roundMetric(average(plyMs)),
    medianPlyMs: roundMetric(percentile(plyMs, 0.5)),
    p95PlyMs: roundMetric(percentile(plyMs, 0.95)),
    avgAnalyzedPlies: roundMetric(average(analyzedPlies)),
    avgRetriesPerRun: roundMetric(average(retries)),
    budgetStops,
    recommendedBudgetMs,
    recommendedBudgetPerPlyMs: Math.ceil(recommendedBudgetMs / effectivePlies)
  };
}

export function buildPolicyForAnalysisBenchmarkScenario(scenario: AnalysisBenchmarkScenario): {
  defaultDepth: number;
  defaultMultiPV: number;
  softPerPositionMaxMs: number;
  baseForegroundBudgetMs: number;
  foregroundBudgetPerPlyMs: number;
} {
  return {
    defaultDepth: scenario.settings.depth,
    defaultMultiPV: scenario.settings.multiPV,
    softPerPositionMaxMs: scenario.settings.movetimeMs,
    baseForegroundBudgetMs: scenario.settings.baseForegroundBudgetMs,
    foregroundBudgetPerPlyMs: scenario.settings.foregroundBudgetPerPlyMs
  };
}
