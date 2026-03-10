import { buildPolicyForAnalysisBenchmarkScenario, summarizeAnalysisBenchmarkScenario, type AnalysisBenchmarkRepetition, type AnalysisBenchmarkScenario, type AnalysisBenchmarkScenarioResult } from "../domain/analysisBenchmark.js";
import type { AnalysisRun, GameRecord, PlyAnalysis } from "../domain/types.js";
import type { EngineFlavor } from "../engine/engineClient.js";
import { runGameAnalysis, type AnalyzePositionInput, type AnalyzePositionResult } from "./runGameAnalysis.js";

export type AnalysisBenchmarkEngine = {
  init: (flavor: EngineFlavor) => Promise<void>;
  analyzePosition: (input: AnalyzePositionInput) => Promise<AnalyzePositionResult>;
  terminate: () => void;
};

export type RunAnalysisBenchmarkArgs = {
  game: GameRecord;
  fenPositions: string[];
  moveSanList: string[];
  totalPlies: number;
  scenarios: AnalysisBenchmarkScenario[];
  repetitions: number;
  createEngine: () => AnalysisBenchmarkEngine;
  saveRun: (run: AnalysisRun) => Promise<void>;
  savePly: (ply: PlyAnalysis) => Promise<void>;
  listPlyAnalysisByRunId: (runId: string) => Promise<PlyAnalysis[]>;
  clearStorage: () => Promise<void>;
  nowMs?: () => number;
  createId?: () => string;
  analysisNowMs?: () => number;
  analysisNowIso?: () => string;
  analysisWaitMs?: (ms: number) => Promise<void>;
  onProgress?: (progress: {
    scenarioIndex: number;
    totalScenarios: number;
    repetition: number;
    totalRepetitions: number;
    scenarioLabel: string;
    phase: "starting-scenario" | "running-repetition" | "completed-repetition" | "completed-scenario" | "skipped-scenario";
    message: string;
  }) => void;
};

export type RunAnalysisBenchmarkResult = {
  scenarios: AnalysisBenchmarkScenarioResult[];
};

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown benchmark error";
  }
}

function toBenchmarkFinalStatus(status: AnalysisRun["status"]): "completed" | "cancelled" | "failed" {
  if (status === "completed" || status === "cancelled" || status === "failed") {
    return status;
  }
  return "failed";
}

function lastScenarioResult(results: AnalysisBenchmarkScenarioResult[]): AnalysisBenchmarkScenarioResult | undefined {
  return results.length > 0 ? results[results.length - 1] : undefined;
}

export async function runAnalysisBenchmark(args: RunAnalysisBenchmarkArgs): Promise<RunAnalysisBenchmarkResult> {
  const nowMs = args.nowMs ?? (() => Date.now());
  const createId = args.createId ?? (() => crypto.randomUUID());
  const scenarioResults: AnalysisBenchmarkScenarioResult[] = [];

  for (let scenarioIndex = 0; scenarioIndex < args.scenarios.length; scenarioIndex += 1) {
    const scenario = args.scenarios[scenarioIndex];
    const repetitions: AnalysisBenchmarkRepetition[] = [];
    let note: string | undefined;

    args.onProgress?.({
      scenarioIndex,
      totalScenarios: args.scenarios.length,
      repetition: 0,
      totalRepetitions: args.repetitions,
      scenarioLabel: scenario.label,
      phase: "starting-scenario",
      message: `Starting ${scenario.label}.`
    });

    for (let repetition = 1; repetition <= args.repetitions; repetition += 1) {
      await args.clearStorage();
      const engine = args.createEngine();
      let cancelRequested = false;

      try {
        args.onProgress?.({
          scenarioIndex,
          totalScenarios: args.scenarios.length,
          repetition,
          totalRepetitions: args.repetitions,
          scenarioLabel: scenario.label,
          phase: "running-repetition",
          message: `Running ${scenario.label} (${repetition}/${args.repetitions}).`
        });

        const initStartedAt = nowMs();
        await engine.init(scenario.settings.engineFlavor);
        const engineInitMs = nowMs() - initStartedAt;

        const plyTimes: number[] = [];
        const runStartedAt = nowMs();
        const result = await runGameAnalysis({
          game: args.game,
          fenPositions: args.fenPositions,
          moveSanList: args.moveSanList,
          engineFlavor: scenario.settings.engineFlavor,
          analyzePosition: engine.analyzePosition,
          saveRun: args.saveRun,
          savePly: async (ply) => {
            if (typeof ply.timeMs === "number") {
              plyTimes.push(ply.timeMs);
            }
            await args.savePly(ply);
          },
          isCancelRequested: () => cancelRequested,
          markCancelRequested: () => {
            cancelRequested = true;
          },
          policy: buildPolicyForAnalysisBenchmarkScenario(scenario),
          createId,
          nowMs: args.analysisNowMs,
          nowIso: args.analysisNowIso,
          waitMs: args.analysisWaitMs
        });

        const persistedPlies = await args.listPlyAnalysisByRunId(result.finalRun.id);
        const persistedTimes = persistedPlies.flatMap((ply) => (typeof ply.timeMs === "number" ? [ply.timeMs] : []));

        repetitions.push({
          repetition,
          engineInitMs,
          runMs: nowMs() - runStartedAt,
          analyzedPlies: result.done,
          retriesUsed: result.retriesUsed,
          stoppedByBudget: result.stoppedByBudget,
          finalStatus: toBenchmarkFinalStatus(result.finalRun.status),
          error: result.finalRun.error,
          plyTimeMs: persistedTimes.length > 0 ? persistedTimes : plyTimes
        });

        args.onProgress?.({
          scenarioIndex,
          totalScenarios: args.scenarios.length,
          repetition,
          totalRepetitions: args.repetitions,
          scenarioLabel: scenario.label,
          phase: "completed-repetition",
          message: `Completed ${scenario.label} (${repetition}/${args.repetitions}).`
        });
      } catch (error) {
        const reason = formatUnknownError(error);
        engine.terminate();

        if (repetitions.length === 0) {
          scenarioResults.push({
            status: "skipped",
            scenario,
            repetitions,
            reason: `Unsupported in this environment: ${reason}`
          });
          args.onProgress?.({
            scenarioIndex,
            totalScenarios: args.scenarios.length,
            repetition,
            totalRepetitions: args.repetitions,
            scenarioLabel: scenario.label,
            phase: "skipped-scenario",
            message: `Skipped ${scenario.label}: ${reason}`
          });
          note = undefined;
          break;
        }

        note = `Stopped after ${repetitions.length}/${args.repetitions} runs: ${reason}`;
        break;
      } finally {
        const lastResult = lastScenarioResult(scenarioResults);
        if (lastResult?.status !== "skipped" || lastResult?.scenario.id !== scenario.id) {
          engine.terminate();
        }
      }
    }

    const lastResult = lastScenarioResult(scenarioResults);
    if (lastResult?.status === "skipped" && lastResult.scenario.id === scenario.id) {
      continue;
    }

    scenarioResults.push({
      status: "completed",
      scenario,
      repetitions,
      summary: summarizeAnalysisBenchmarkScenario({
        totalPlies: args.totalPlies,
        repetitions
      }),
      note
    });

    args.onProgress?.({
      scenarioIndex,
      totalScenarios: args.scenarios.length,
      repetition: repetitions.length,
      totalRepetitions: args.repetitions,
      scenarioLabel: scenario.label,
      phase: "completed-scenario",
      message: `Completed ${scenario.label}.`
    });
  }

  return { scenarios: scenarioResults };
}
