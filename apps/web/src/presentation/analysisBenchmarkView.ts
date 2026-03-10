import { buildAnalysisBenchmarkKnobs, buildAnalysisBenchmarkScenarios, listBlockedAnalysisBenchmarkKnobs, type AnalysisBenchmarkScenarioResult } from "../domain/analysisBenchmark.js";

export type AnalysisBenchmarkScenarioCard = {
  id: string;
  title: string;
  description: string;
  settingsSummary: string;
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
  budgetStops: string;
  recommendedBudgetMs: string;
  derivedBudgetPerPlyMs: string;
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
    settingsSummary: `${scenario.settings.engineFlavor}, depth ${scenario.settings.depth}, ${scenario.settings.movetimeMs}ms, MultiPV ${scenario.settings.multiPV}`
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
        budgetStops: "n/a",
        recommendedBudgetMs: "n/a",
        derivedBudgetPerPlyMs: "n/a",
        statusText: result.reason
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
      budgetStops: String(result.summary.budgetStops),
      recommendedBudgetMs: formatMs(result.summary.recommendedBudgetMs),
      derivedBudgetPerPlyMs: formatMs(result.summary.recommendedBudgetPerPlyMs),
      statusText: result.note ?? "Completed"
    };
  });
}
