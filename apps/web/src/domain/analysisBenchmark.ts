import { ANALYSIS_POLICY } from "./analysisPolicy.js";
import {
  BUNDLED_ENGINE_FLAVORS,
  PREPARED_ENGINE_FLAVORS,
  SHIPPED_ENGINE_FLAVOR,
  type EngineFlavor
} from "../engine/engineFlavorConfig.js";

export const ANALYSIS_BENCHMARK_REPETITIONS = 5;
const ANALYSIS_BENCHMARK_HEADROOM = 1.15;

export type AnalysisBenchmarkScenario = {
  id: string;
  label: string;
  description: string;
  comparisonMode: "primary" | "secondary";
  settings: {
    engineFlavor: EngineFlavor;
    depth: number;
    movetimeMs: number;
    multiPV: number;
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
  safetyStops: number;
  projectedFullRunMs: number;
  recommendedSafetyBudgetMs: number;
};

export type AnalysisBenchmarkFailureStep =
  | "clear-storage"
  | "create-engine"
  | "engine-init"
  | "analysis-execution"
  | "save-run"
  | "save-ply"
  | "load-ply-results";

export type AnalysisBenchmarkProgress = {
  scenarioIndex: number;
  totalScenarios: number;
  repetition: number;
  totalRepetitions: number;
  scenarioLabel: string;
  phase:
    | "starting-scenario"
    | "running-repetition"
    | "completed-repetition"
    | "completed-scenario"
    | "skipped-scenario"
    | "failed-scenario";
  message: string;
  failedStep?: AnalysisBenchmarkFailureStep;
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
      failedStep: "engine-init";
      failedRepetition: number;
    }
  | {
      status: "failed";
      scenario: AnalysisBenchmarkScenario;
      repetitions: AnalysisBenchmarkRepetition[];
      summary?: AnalysisBenchmarkScenarioSummary;
      reason: string;
      failedStep: AnalysisBenchmarkFailureStep;
      failedRepetition: number;
    };

export type AnalysisBenchmarkKnob = {
  key: "engineFlavor" | "depth" | "movetimeMs" | "multiPV" | "perPlyTimeMultiplier" | "totalBudgetBuffer" | "emergencyHardCapMs";
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
  } = ANALYSIS_POLICY
): AnalysisBenchmarkScenario[] {
  const baselineSettings = {
    engineFlavor: SHIPPED_ENGINE_FLAVOR,
    depth: policy.defaultDepth,
    movetimeMs: policy.softPerPositionMaxMs,
    multiPV: policy.defaultMultiPV
  };

  const scenarios: AnalysisBenchmarkScenario[] = [
    {
      id: "baseline",
      label: "Baseline",
      description: "Current shipped lite single-thread profile.",
      comparisonMode: "primary",
      settings: baselineSettings
    },
    {
      id: "depth-12",
      label: "Depth 12",
      description: "Lower search depth for a secondary diagnostic while movetime remains active.",
      comparisonMode: "secondary",
      settings: { ...baselineSettings, depth: 12 }
    },
    {
      id: "depth-18",
      label: "Depth 18",
      description: "Higher search depth for a secondary diagnostic while movetime remains active.",
      comparisonMode: "secondary",
      settings: { ...baselineSettings, depth: 18 }
    },
    {
      id: "movetime-800",
      label: "Movetime 800ms",
      description: "Tighter per-position cap to test faster turnarounds.",
      comparisonMode: "primary",
      settings: { ...baselineSettings, movetimeMs: 800 }
    },
    {
      id: "movetime-1600",
      label: "Movetime 1600ms",
      description: "Looser per-position cap to compare stronger but slower runs.",
      comparisonMode: "primary",
      settings: { ...baselineSettings, movetimeMs: 1600 }
    },
    {
      id: "multipv-2",
      label: "MultiPV 2",
      description: "Request two lines and observe the cost increase over baseline.",
      comparisonMode: "primary",
      settings: { ...baselineSettings, multiPV: 2 }
    }
  ];

  if ((BUNDLED_ENGINE_FLAVORS as readonly string[]).includes("stockfish-18-single")) {
    scenarios.push({
      id: "engine-single",
      label: "Single Engine",
      description: "Use the heavier single-thread engine build if it initializes successfully.",
      comparisonMode: "primary",
      settings: { ...baselineSettings, engineFlavor: "stockfish-18-single" }
    });
  }

  return scenarios;
}

export function buildAnalysisBenchmarkKnobs(
  policy: {
    defaultDepth: number;
    defaultMultiPV: number;
    softPerPositionMaxMs: number;
    perPlyTimeMultiplier: number;
    totalBudgetBuffer: number;
    emergencyHardCapMs: number;
  } = ANALYSIS_POLICY
): AnalysisBenchmarkKnob[] {
  const preparedAlternatives = PREPARED_ENGINE_FLAVORS.filter(
    (flavor) => !(BUNDLED_ENGINE_FLAVORS as readonly string[]).includes(flavor)
  );
  return [
    {
      key: "engineFlavor",
      label: "Engine flavor",
      value: BUNDLED_ENGINE_FLAVORS.join(", "),
      help:
        preparedAlternatives.length > 0
          ? `Worker engine asset bundle used for the run. Prepared but not bundled in this build: ${preparedAlternatives.join(", ")}.`
          : "Worker engine asset bundle used for the run."
    },
    {
      key: "depth",
      label: "Depth",
      value: String(policy.defaultDepth),
      help: "Depth remains supported, but is only a secondary diagnostic when movetime is active."
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
      key: "perPlyTimeMultiplier",
      label: "Per-ply multiplier",
      value: String(policy.perPlyTimeMultiplier),
      help: "Converts movetime into expected wall-clock cost per analyzed ply."
    },
    {
      key: "totalBudgetBuffer",
      label: "Budget buffer",
      value: String(policy.totalBudgetBuffer),
      help: "Safety headroom applied on top of projected full-run time."
    },
    {
      key: "emergencyHardCapMs",
      label: "Emergency hard cap",
      value: `${policy.emergencyHardCapMs}ms`,
      help: "Last-resort ceiling for unusually slow environments."
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
  const safetyStops = args.repetitions.filter((repetition) => repetition.stoppedByBudget).length;
  const avgPlyMs = roundMetric(average(plyMs));
  const effectivePlies = Math.max(1, args.totalPlies);
  const projectedFullRunMs = avgPlyMs * effectivePlies;

  return {
    runsCompleted: args.repetitions.length,
    avgRunMs: roundMetric(average(runMs)),
    medianRunMs: roundMetric(percentile(runMs, 0.5)),
    p95RunMs: roundMetric(percentile(runMs, 0.95)),
    avgPlyMs,
    medianPlyMs: roundMetric(percentile(plyMs, 0.5)),
    p95PlyMs: roundMetric(percentile(plyMs, 0.95)),
    avgAnalyzedPlies: roundMetric(average(analyzedPlies)),
    avgRetriesPerRun: roundMetric(average(retries)),
    safetyStops,
    projectedFullRunMs,
    recommendedSafetyBudgetMs: Math.ceil(projectedFullRunMs * ANALYSIS_BENCHMARK_HEADROOM)
  };
}

export function buildPolicyForAnalysisBenchmarkScenario(scenario: AnalysisBenchmarkScenario): {
  defaultDepth: number;
  defaultMultiPV: number;
  softPerPositionMaxMs: number;
  perPlyTimeMultiplier: number;
  totalBudgetBuffer: number;
  emergencyHardCapMs: number;
} {
  return {
    defaultDepth: scenario.settings.depth,
    defaultMultiPV: scenario.settings.multiPV,
    softPerPositionMaxMs: scenario.settings.movetimeMs,
    perPlyTimeMultiplier: ANALYSIS_POLICY.perPlyTimeMultiplier,
    totalBudgetBuffer: ANALYSIS_POLICY.totalBudgetBuffer,
    emergencyHardCapMs: ANALYSIS_POLICY.emergencyHardCapMs
  };
}
