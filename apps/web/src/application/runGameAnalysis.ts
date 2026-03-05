import { buildAnalysisPlan, lowerDepthForRetry } from "../domain/analysisPlan.js";
import { finalizeRun } from "../domain/analysisRunLifecycle.js";
import { ANALYSIS_POLICY } from "../domain/analysisPolicy.js";
import type { AnalysisRun, GameRecord, PlyAnalysis } from "../domain/types.js";

const ANALYSIS_RETRY_LIMIT = 1;

type AnalyzePositionInput = {
  fen: string;
  movesUci: string[];
  depth: number;
  multiPV: number;
  movetimeMs?: number;
};

type AnalyzePositionResult =
  | {
      type: "engine:result";
      payload: {
        bestMoveUci?: string;
        evaluationType: "cp" | "mate";
        evaluation: number;
        depth: number;
        nodes?: number;
        nps?: number;
        pvUci: string[];
      };
    }
  | { type: "engine:cancelled" };

export type RunGameAnalysisArgs = {
  game: GameRecord;
  fenPositions: string[];
  moveSanList: string[];
  engineFlavor: string;
  analyzePosition: (input: AnalyzePositionInput) => Promise<AnalyzePositionResult>;
  saveRun: (run: AnalysisRun) => Promise<void>;
  savePly: (ply: PlyAnalysis) => Promise<void>;
  isCancelRequested: () => boolean;
  markCancelRequested: () => void;
  onRetryStatus?: (message: string) => void;
  onRunUpdated?: (run: AnalysisRun) => void;
  onPlySaved?: (ply: PlyAnalysis) => void;
  onProgress?: (progress: { done: number; total: number }) => void;
  policy?: {
    defaultDepth: number;
    defaultMultiPV: number;
    softPerPositionMaxMs: number;
    foregroundBudgetMs: number;
  };
  nowMs?: () => number;
  nowIso?: () => string;
  waitMs?: (ms: number) => Promise<void>;
  createId?: () => string;
};

export type RunGameAnalysisResult = {
  finalRun: AnalysisRun;
  done: number;
  retriesUsed: number;
  stoppedByBudget: boolean;
};

function defaultWaitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canRetryFromMessage(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("timed out") ||
    lowered.includes("engine worker error") ||
    lowered.includes("another analysis is already running")
  );
}

export function buildRunningRun(input: {
  gameId: string;
  engineFlavor: string;
  createId: () => string;
  nowIso: () => string;
  policy: {
    defaultDepth: number;
    defaultMultiPV: number;
    softPerPositionMaxMs: number;
  };
}): AnalysisRun {
  return {
    id: input.createId(),
    gameId: input.gameId,
    schemaVersion: 1,
    engineName: "Stockfish",
    engineVersion: "18",
    engineFlavor: input.engineFlavor,
    options: {
      depth: input.policy.defaultDepth,
      multiPV: input.policy.defaultMultiPV,
      movetimeMs: input.policy.softPerPositionMaxMs
    },
    status: "running",
    createdAt: input.nowIso()
  };
}

export async function runGameAnalysis(args: RunGameAnalysisArgs): Promise<RunGameAnalysisResult> {
  const policy = args.policy ?? ANALYSIS_POLICY;
  const nowMs = args.nowMs ?? (() => Date.now());
  const nowIso = args.nowIso ?? (() => new Date().toISOString());
  const waitMs = args.waitMs ?? defaultWaitMs;
  const createId = args.createId ?? (() => crypto.randomUUID());

  const plan = buildAnalysisPlan(args.game.movesUci.length, args.moveSanList, policy.defaultDepth);
  args.onProgress?.({ done: 0, total: plan.length });

  const run = buildRunningRun({
    gameId: args.game.id,
    engineFlavor: args.engineFlavor,
    createId,
    nowIso,
    policy
  });

  await args.saveRun(run);
  args.onRunUpdated?.(run);

  const runStartedAt = nowMs();
  let done = 0;
  let retriesUsed = 0;
  let stoppedByBudget = false;

  try {
    for (const step of plan) {
      if (args.isCancelRequested()) {
        break;
      }

      const fen = args.fenPositions[step.ply];
      if (!fen) {
        continue;
      }

      const startedStepAt = nowMs();
      let result: AnalyzePositionResult | null = null;
      let depthForAttempt = step.depth;
      let attempt = 0;

      while (attempt <= ANALYSIS_RETRY_LIMIT) {
        try {
          result = await args.analyzePosition({
            fen,
            movesUci: args.game.movesUci.slice(0, step.ply),
            depth: depthForAttempt,
            multiPV: policy.defaultMultiPV,
            movetimeMs: policy.softPerPositionMaxMs
          });
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown engine error";
          const canRetry = attempt < ANALYSIS_RETRY_LIMIT && canRetryFromMessage(message);
          if (!canRetry) {
            throw error;
          }

          retriesUsed += 1;
          attempt += 1;
          depthForAttempt = lowerDepthForRetry(depthForAttempt);
          args.onRetryStatus?.(`Retrying ply ${step.ply} after engine timeout/error (depth ${depthForAttempt})...`);
          await waitMs(80);
        }
      }

      if (!result) {
        throw new Error("Engine returned no result");
      }

      if (result.type === "engine:cancelled") {
        args.markCancelRequested();
        break;
      }

      const plyRecord: PlyAnalysis = {
        id: createId(),
        runId: run.id,
        gameId: args.game.id,
        ply: step.ply,
        fen,
        playedMoveUci: args.game.movesUci[step.ply],
        bestMoveUci: result.payload.bestMoveUci,
        evaluationType: result.payload.evaluationType,
        evaluation: result.payload.evaluation,
        depth: result.payload.depth,
        nodes: result.payload.nodes,
        nps: result.payload.nps,
        timeMs: nowMs() - startedStepAt,
        pvUci: result.payload.pvUci
      };

      await args.savePly(plyRecord);
      args.onPlySaved?.(plyRecord);

      done += 1;
      args.onProgress?.({ done, total: plan.length });

      if (nowMs() - runStartedAt > policy.foregroundBudgetMs) {
        args.markCancelRequested();
        stoppedByBudget = true;
        break;
      }
    }

    const finishedRun = finalizeRun({
      run,
      outcome: args.isCancelRequested() ? "cancelled" : "completed",
      completedAt: nowIso(),
      retriesUsed,
      stoppedByBudget
    });

    await args.saveRun(finishedRun);
    args.onRunUpdated?.(finishedRun);

    return {
      finalRun: finishedRun,
      done,
      retriesUsed,
      stoppedByBudget
    };
  } catch (error) {
    const failedRun = finalizeRun({
      run,
      outcome: "failed",
      completedAt: nowIso(),
      failureMessage: error instanceof Error ? error.message : "Unknown analysis error"
    });
    await args.saveRun(failedRun);
    args.onRunUpdated?.(failedRun);

    return {
      finalRun: failedRun,
      done,
      retriesUsed,
      stoppedByBudget
    };
  }
}
