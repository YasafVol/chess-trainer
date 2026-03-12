import { buildAnalysisBenchmarkKnobs, buildAnalysisBenchmarkScenarios, listBlockedAnalysisBenchmarkKnobs, type AnalysisBenchmarkScenarioResult } from "../domain/analysisBenchmark.js";

export type AnalysisBenchmarkScenarioCard = {
  id: string;
  title: string;
  description: string;
  settingsSummary: string;
  comparisonNote?: string;
};

export type AnalysisBenchmarkResultRow = {
  id: string;
  scenario: string;
  runsCompleted: string;
  avgRunMs: string;
  p95RunMs: string;
  avgPlyMs: string;
  p95PlyMs: string;
  avgAnalyzedPlies: string;
  retriesPerRun: string;
  safetyStops: string;
  projectedFullRunMs: string;
  recommendedSafetyBudgetMs: string;
  statusText: string;
};

function formatMs(value: number): string {
  return `${value}ms`;
}

export function buildAnalysisBenchmarkScenarioCards(): AnalysisBenchmarkScenarioCard[] {
  return buildAnalysisBenchmarkScenarios().map((scenario) => ({
    id: scenario.id,
    title: scenario.label,
    description: scenario.description,
    settingsSummary: `${scenario.settings.engineFlavor}, depth ${scenario.settings.depth}, ${scenario.settings.movetimeMs}ms, MultiPV ${scenario.settings.multiPV}`,
    comparisonNote:
      scenario.comparisonMode === "secondary"
        ? "Secondary diagnostic while movetime is active."
        : undefined
  }));
}

export function buildAnalysisBenchmarkKnobRows() {
  return buildAnalysisBenchmarkKnobs();
}

export function buildAnalysisBenchmarkBlockedRows() {
  return listBlockedAnalysisBenchmarkKnobs();
}

export function buildAnalysisBenchmarkResultRows(results: AnalysisBenchmarkScenarioResult[]): AnalysisBenchmarkResultRow[] {
  return results.map((result) => {
    if (result.status === "skipped") {
      return {
        id: result.scenario.id,
        scenario: result.scenario.label,
        runsCompleted: "0/5",
        avgRunMs: "n/a",
        p95RunMs: "n/a",
        avgPlyMs: "n/a",
        p95PlyMs: "n/a",
        avgAnalyzedPlies: "n/a",
        retriesPerRun: "n/a",
        safetyStops: "n/a",
        projectedFullRunMs: "n/a",
        recommendedSafetyBudgetMs: "n/a",
        statusText: result.reason
      };
    }

    if (result.status === "failed") {
      return {
        id: result.scenario.id,
        scenario: result.scenario.label,
        runsCompleted: result.summary ? `${result.summary.runsCompleted}/5` : `${Math.max(0, result.failedRepetition - 1)}/5`,
        avgRunMs: result.summary ? formatMs(result.summary.avgRunMs) : "n/a",
        p95RunMs: result.summary ? formatMs(result.summary.p95RunMs) : "n/a",
        avgPlyMs: result.summary ? formatMs(result.summary.avgPlyMs) : "n/a",
        p95PlyMs: result.summary ? formatMs(result.summary.p95PlyMs) : "n/a",
        avgAnalyzedPlies: result.summary ? String(result.summary.avgAnalyzedPlies) : "n/a",
        retriesPerRun: result.summary ? String(result.summary.avgRetriesPerRun) : "n/a",
        safetyStops: result.summary ? String(result.summary.safetyStops) : "n/a",
        projectedFullRunMs: result.summary ? formatMs(result.summary.projectedFullRunMs) : "n/a",
        recommendedSafetyBudgetMs: result.summary ? formatMs(result.summary.recommendedSafetyBudgetMs) : "n/a",
        statusText: `Failed at run ${result.failedRepetition} (${result.failedStep}): ${result.reason}`
      };
    }

    return {
      id: result.scenario.id,
      scenario: result.scenario.label,
      runsCompleted: `${result.summary.runsCompleted}/5`,
      avgRunMs: formatMs(result.summary.avgRunMs),
      p95RunMs: formatMs(result.summary.p95RunMs),
      avgPlyMs: formatMs(result.summary.avgPlyMs),
      p95PlyMs: formatMs(result.summary.p95PlyMs),
      avgAnalyzedPlies: String(result.summary.avgAnalyzedPlies),
      retriesPerRun: String(result.summary.avgRetriesPerRun),
      safetyStops: String(result.summary.safetyStops),
      projectedFullRunMs: formatMs(result.summary.projectedFullRunMs),
      recommendedSafetyBudgetMs: formatMs(result.summary.recommendedSafetyBudgetMs),
      statusText: result.note ?? "Completed"
    };
  });
}
