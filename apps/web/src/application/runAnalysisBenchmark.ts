import {
  buildPolicyForAnalysisBenchmarkScenario,
  summarizeAnalysisBenchmarkScenario,
  type AnalysisBenchmarkFailureStep,
  type AnalysisBenchmarkProgress,
  type AnalysisBenchmarkRepetition,
  type AnalysisBenchmarkScenario,
  type AnalysisBenchmarkScenarioResult
} from "../domain/analysisBenchmark.js";
import type { AnalysisRun, GameRecord, PlyAnalysis } from "../domain/types.js";
import type { EngineFlavor } from "../engine/engineFlavorConfig.js";
import { formatUnknownError } from "../lib/formatUnknownError.js";
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
  onProgress?: (progress: AnalysisBenchmarkProgress) => void;
};

export type RunAnalysisBenchmarkResult = {
  scenarios: AnalysisBenchmarkScenarioResult[];
};

function toBenchmarkFinalStatus(status: AnalysisRun["status"]): "completed" | "cancelled" | "failed" {
  if (status === "completed" || status === "cancelled" || status === "failed") {
    return status;
  }
  return "failed";
}

function lastScenarioResult(results: AnalysisBenchmarkScenarioResult[]): AnalysisBenchmarkScenarioResult | undefined {
  return results.length > 0 ? results[results.length - 1] : undefined;
}

function buildFailureMessage(input: {
  scenarioLabel: string;
  repetition: number;
  failedStep: AnalysisBenchmarkFailureStep;
  reason: string;
}): string {
  return `${input.scenarioLabel} run ${input.repetition} failed during ${input.failedStep}: ${input.reason}`;
}

function buildFailedResult(input: {
  scenario: AnalysisBenchmarkScenario;
  repetitions: AnalysisBenchmarkRepetition[];
  totalPlies: number;
  failedRepetition: number;
  failedStep: AnalysisBenchmarkFailureStep;
  reason: string;
}): AnalysisBenchmarkScenarioResult {
  return {
    status: "failed",
    scenario: input.scenario,
    repetitions: input.repetitions,
    summary:
      input.repetitions.length > 0
        ? summarizeAnalysisBenchmarkScenario({
            totalPlies: input.totalPlies,
            repetitions: input.repetitions
          })
        : undefined,
    reason: input.reason,
    failedStep: input.failedStep,
    failedRepetition: input.failedRepetition
  };
}

function isScenarioSpecificUnsupportedFailure(step: AnalysisBenchmarkFailureStep, scenarioIndex: number, repetitions: number): boolean {
  return step === "engine-init" && scenarioIndex > 0 && repetitions === 0;
}

function reportFailure(args: {
  progress?: (progress: AnalysisBenchmarkProgress) => void;
  scenarioIndex: number;
  totalScenarios: number;
  repetition: number;
  totalRepetitions: number;
  scenarioLabel: string;
  failedStep: AnalysisBenchmarkFailureStep;
  reason: string;
}): void {
  args.progress?.({
    scenarioIndex: args.scenarioIndex,
    totalScenarios: args.totalScenarios,
    repetition: args.repetition,
    totalRepetitions: args.totalRepetitions,
    scenarioLabel: args.scenarioLabel,
    phase: "failed-scenario",
    failedStep: args.failedStep,
    message: buildFailureMessage({
      scenarioLabel: args.scenarioLabel,
      repetition: args.repetition,
      failedStep: args.failedStep,
      reason: args.reason
    })
  });
}

export async function runAnalysisBenchmark(args: RunAnalysisBenchmarkArgs): Promise<RunAnalysisBenchmarkResult> {
  const nowMs = args.nowMs ?? (() => Date.now());
  const createId = args.createId ?? (() => crypto.randomUUID());
  const scenarioResults: AnalysisBenchmarkScenarioResult[] = [];

  for (let scenarioIndex = 0; scenarioIndex < args.scenarios.length; scenarioIndex += 1) {
    const scenario = args.scenarios[scenarioIndex];
    const repetitions: AnalysisBenchmarkRepetition[] = [];
    let note: string | undefined =
      scenario.comparisonMode === "secondary"
        ? "Completed. Secondary diagnostic while movetime is active."
        : undefined;

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
      let engine: AnalysisBenchmarkEngine | null = null;
      let cancelRequested = false;
      let lastFailureStep: AnalysisBenchmarkFailureStep | undefined;

      try {
        try {
          console.log("[benchmark] clear storage start", {
            scenario: scenario.label,
            repetition
          });
          await args.clearStorage();
          console.log("[benchmark] clear storage complete", {
            scenario: scenario.label,
            repetition
          });
        } catch (error) {
          throw { step: "clear-storage" as const, cause: error };
        }

        try {
          console.log("[benchmark] create engine", {
            scenario: scenario.label,
            repetition,
            engineFlavor: scenario.settings.engineFlavor
          });
          engine = args.createEngine();
        } catch (error) {
          throw { step: "create-engine" as const, cause: error };
        }

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
        try {
          console.log("[benchmark] engine init start", {
            scenario: scenario.label,
            repetition,
            engineFlavor: scenario.settings.engineFlavor
          });
          await engine.init(scenario.settings.engineFlavor);
          console.log("[benchmark] engine init complete", {
            scenario: scenario.label,
            repetition,
            engineFlavor: scenario.settings.engineFlavor,
            engineInitMs: nowMs() - initStartedAt
          });
        } catch (error) {
          throw { step: "engine-init" as const, cause: error };
        }
        const engineInitMs = nowMs() - initStartedAt;

        const plyTimes: number[] = [];
        const runStartedAt = nowMs();
        console.log("[benchmark] analysis run start", {
          scenario: scenario.label,
          repetition,
          engineFlavor: scenario.settings.engineFlavor,
          depth: scenario.settings.depth,
          movetimeMs: scenario.settings.movetimeMs,
          multiPV: scenario.settings.multiPV
        });
        const result = await runGameAnalysis({
          game: args.game,
          fenPositions: args.fenPositions,
          moveSanList: args.moveSanList,
          engineFlavor: scenario.settings.engineFlavor,
          analyzePosition: (input) => engine!.analyzePosition(input),
          saveRun: async (run) => {
            try {
              console.log("[benchmark] save run", {
                scenario: scenario.label,
                repetition,
                runId: run.id,
                status: run.status
              });
              await args.saveRun(run);
            } catch (error) {
              lastFailureStep = "save-run";
              throw new Error(
                `saveRun failed for scenario ${scenario.label} run ${repetition}: ${formatUnknownError(error, "Unknown benchmark saveRun error")}`
              );
            }
          },
          savePly: async (ply) => {
            if (typeof ply.timeMs === "number") {
              plyTimes.push(ply.timeMs);
            }
            try {
              console.log("[benchmark] save ply", {
                scenario: scenario.label,
                repetition,
                runId: ply.runId,
                ply: ply.ply,
                timeMs: ply.timeMs,
                evaluation: ply.evaluation
              });
              await args.savePly(ply);
            } catch (error) {
              lastFailureStep = "save-ply";
              throw new Error(
                `savePly failed for scenario ${scenario.label} run ${repetition} ply ${ply.ply}: ${formatUnknownError(error, "Unknown benchmark savePly error")}`
              );
            }
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

        if (result.finalRun.status === "failed") {
          const failedStep = lastFailureStep ?? "analysis-execution";
          const reason = formatUnknownError(result.finalRun.error, "Unknown benchmark analysis error");
          const failure = buildFailedResult({
            scenario,
            repetitions,
            totalPlies: args.totalPlies,
            failedRepetition: repetition,
            failedStep,
            reason
          });
          scenarioResults.push(failure);
          console.error("[benchmark] scenario failed", {
            scenario: scenario.label,
            repetition,
            failedStep,
            reason
          });
          reportFailure({
            progress: args.onProgress,
            scenarioIndex,
            totalScenarios: args.scenarios.length,
            repetition,
            totalRepetitions: args.repetitions,
            scenarioLabel: scenario.label,
            failedStep,
            reason
          });
          break;
        }

        let persistedPlies: PlyAnalysis[];
        try {
          console.log("[benchmark] reload ply results", {
            scenario: scenario.label,
            repetition,
            runId: result.finalRun.id
          });
          persistedPlies = await args.listPlyAnalysisByRunId(result.finalRun.id);
          console.log("[benchmark] reload ply results complete", {
            scenario: scenario.label,
            repetition,
            runId: result.finalRun.id,
            count: persistedPlies.length
          });
        } catch (error) {
          throw { step: "load-ply-results" as const, cause: error };
        }
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
        console.log("[benchmark] analysis run complete", {
          scenario: scenario.label,
          repetition,
          runId: result.finalRun.id,
          status: result.finalRun.status,
          runMs: nowMs() - runStartedAt,
          analyzedPlies: result.done,
          retriesUsed: result.retriesUsed,
          stoppedByBudget: result.stoppedByBudget
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
        const failedStep =
          error && typeof error === "object" && "step" in error
            ? ((error as { step: AnalysisBenchmarkFailureStep }).step)
            : (lastFailureStep ?? "analysis-execution");
        const cause =
          error && typeof error === "object" && "cause" in error
            ? (error as { cause: unknown }).cause
            : error;
        const reason = formatUnknownError(cause, "Unknown benchmark error");
        engine?.terminate();

        if (isScenarioSpecificUnsupportedFailure(failedStep, scenarioIndex, repetitions.length)) {
          scenarioResults.push({
            status: "skipped",
            scenario,
            repetitions,
            reason: `Unsupported in this environment: ${reason}`,
            failedStep: "engine-init",
            failedRepetition: repetition
          });
          args.onProgress?.({
            scenarioIndex,
            totalScenarios: args.scenarios.length,
            repetition,
            totalRepetitions: args.repetitions,
            scenarioLabel: scenario.label,
            phase: "skipped-scenario",
            failedStep: "engine-init",
            message: `Skipped ${scenario.label}: ${reason}`
          });
          note = undefined;
          break;
        }

        const failure = buildFailedResult({
          scenario,
          repetitions,
          totalPlies: args.totalPlies,
          failedRepetition: repetition,
          failedStep,
          reason
        });
        scenarioResults.push(failure);
        console.error("[benchmark] scenario failed", {
          scenario: scenario.label,
          repetition,
          failedStep,
          reason
        });
        reportFailure({
          progress: args.onProgress,
          scenarioIndex,
          totalScenarios: args.scenarios.length,
          repetition,
          totalRepetitions: args.repetitions,
          scenarioLabel: scenario.label,
          failedStep,
          reason
        });
        break;
      } finally {
        const lastResult = lastScenarioResult(scenarioResults);
        if (engine && (lastResult?.status !== "skipped" || lastResult?.scenario.id !== scenario.id)) {
          console.log("[benchmark] terminate engine", {
            scenario: scenario.label,
            repetition
          });
          engine.terminate();
        }
      }
    }

    const lastResult = lastScenarioResult(scenarioResults);
    if (lastResult?.status === "skipped" && lastResult.scenario.id === scenario.id) {
      continue;
    }
    if (lastResult?.status === "failed" && lastResult.scenario.id === scenario.id) {
      break;
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
