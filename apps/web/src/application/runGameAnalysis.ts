import { buildAnalysisPlan, lowerDepthForRetry } from "../domain/analysisPlan.js";
import { finalizeRun } from "../domain/analysisRunLifecycle.js";
import { ANALYSIS_POLICY, computeForegroundBudgetMs } from "../domain/analysisPolicy.js";
import type { AnalysisRun, GameRecord, PlyAnalysis } from "../domain/types.js";

const ANALYSIS_RETRY_LIMIT = 1;

type AnalyzePositionInput = {
  fen: string;
  movesUci: string[];
  depth: number;
  multiPV: number;
  movetimeMs?: number;
  searchMovesUci?: string[];
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
  onProgress?: (progress: { done: number; total: number; lastCompletedPly: number | null; totalPlies: number }) => void;
  policy?: {
    defaultDepth: number;
    defaultMultiPV: number;
    softPerPositionMaxMs: number;
    baseForegroundBudgetMs: number;
    foregroundBudgetPerPlyMs: number;
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

async function analyzeWithRetry(args: {
  analyzePosition: (input: AnalyzePositionInput) => Promise<AnalyzePositionResult>;
  input: AnalyzePositionInput;
  gameId: string;
  runId: string;
  ply: number;
  retriesUsedRef: { value: number };
  onRetryStatus?: (message: string) => void;
  waitMs: (ms: number) => Promise<void>;
}): Promise<AnalyzePositionResult> {
  let depthForAttempt = args.input.depth;
  let attempt = 0;

  while (attempt <= ANALYSIS_RETRY_LIMIT) {
    try {
      return await args.analyzePosition({
        ...args.input,
        depth: depthForAttempt
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown engine error";
      const canRetry = attempt < ANALYSIS_RETRY_LIMIT && canRetryFromMessage(message);
      console.warn("[analysis] engine step failed", {
        gameId: args.gameId,
        runId: args.runId,
        ply: args.ply,
        attempt,
        message,
        canRetry,
        searchMovesUci: args.input.searchMovesUci
      });
      if (!canRetry) {
        throw error;
      }

      args.retriesUsedRef.value += 1;
      attempt += 1;
      depthForAttempt = lowerDepthForRetry(depthForAttempt);
      args.onRetryStatus?.(`Retrying ply ${args.ply} after engine timeout/error (depth ${depthForAttempt})...`);
      await args.waitMs(80);
    }
  }

  throw new Error("Engine returned no result");
}

export function buildRunningRun(input: {
  game: GameRecord;
  gameId: string;
  engineFlavor: string;
  createId: () => string;
  nowIso: () => string;
  foregroundBudgetMs: number;
  policy: {
    defaultDepth: number;
    defaultMultiPV: number;
    softPerPositionMaxMs: number;
  };
}): AnalysisRun {
  return {
    id: input.createId(),
    userId: input.game.userId,
    gameId: input.gameId,
    schemaVersion: 1,
    engineName: "Stockfish",
    engineVersion: "18",
    engineFlavor: input.engineFlavor,
    options: {
      depth: input.policy.defaultDepth,
      multiPV: input.policy.defaultMultiPV,
      movetimeMs: input.policy.softPerPositionMaxMs,
      foregroundBudgetMs: input.foregroundBudgetMs
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
  const foregroundBudgetMs = computeForegroundBudgetMs(args.game.movesUci.length, policy);
  args.onProgress?.({ done: 0, total: plan.length, lastCompletedPly: null, totalPlies: args.game.movesUci.length });

  const run = buildRunningRun({
    game: args.game,
    gameId: args.game.id,
    engineFlavor: args.engineFlavor,
    createId,
    nowIso,
    foregroundBudgetMs,
    policy
  });

  console.log("[analysis] run start", {
    gameId: args.game.id,
    runId: run.id,
    planLength: plan.length,
    engineFlavor: args.engineFlavor
  });

  await args.saveRun(run);
  args.onRunUpdated?.(run);

  const runStartedAt = nowMs();
  let done = 0;
  let stoppedByBudget = false;
  const retriesUsedRef = { value: 0 };

  try {
    for (const step of plan) {
      if (args.isCancelRequested()) {
        console.log("[analysis] cancel flag observed", { gameId: args.game.id, runId: run.id, step: step.ply });
        break;
      }

      const fen = args.fenPositions[step.ply];
      if (!fen) {
        console.warn("[analysis] missing fen for step", { gameId: args.game.id, runId: run.id, step: step.ply });
        continue;
      }

      const startedStepAt = nowMs();
      const playedMoveUci = args.game.movesUci[step.ply];

      console.log("[analysis] analyze step", {
        gameId: args.game.id,
        runId: run.id,
        ply: step.ply,
        depth: step.depth,
        playedMoveUci
      });

      const result = await analyzeWithRetry({
        analyzePosition: args.analyzePosition,
        input: {
          fen,
          movesUci: args.game.movesUci.slice(0, step.ply),
          depth: step.depth,
          multiPV: policy.defaultMultiPV,
          movetimeMs: policy.softPerPositionMaxMs
        },
        gameId: args.game.id,
        runId: run.id,
        ply: step.ply,
        retriesUsedRef,
        onRetryStatus: args.onRetryStatus,
        waitMs
      });

      if (result.type === "engine:cancelled") {
        console.log("[analysis] engine cancelled step", { gameId: args.game.id, runId: run.id, ply: step.ply });
        args.markCancelRequested();
        break;
      }

      let playedMoveAnalysis:
        | {
            evaluationType: "cp" | "mate";
            evaluation: number;
            depth: number;
            pvUci: string[];
          }
        | undefined;

      if (playedMoveUci) {
        if (result.payload.bestMoveUci === playedMoveUci) {
          playedMoveAnalysis = {
            evaluationType: result.payload.evaluationType,
            evaluation: result.payload.evaluation,
            depth: result.payload.depth,
            pvUci: result.payload.pvUci
          };
        } else {
          const playedMoveResult = await analyzeWithRetry({
            analyzePosition: args.analyzePosition,
            input: {
              fen,
              movesUci: args.game.movesUci.slice(0, step.ply),
              depth: step.depth,
              multiPV: 1,
              movetimeMs: policy.softPerPositionMaxMs,
              searchMovesUci: [playedMoveUci]
            },
            gameId: args.game.id,
            runId: run.id,
            ply: step.ply,
            retriesUsedRef,
            onRetryStatus: args.onRetryStatus,
            waitMs
          });

          if (playedMoveResult.type === "engine:cancelled") {
            console.log("[analysis] engine cancelled played-move search", { gameId: args.game.id, runId: run.id, ply: step.ply });
            args.markCancelRequested();
            break;
          }

          playedMoveAnalysis = {
            evaluationType: playedMoveResult.payload.evaluationType,
            evaluation: playedMoveResult.payload.evaluation,
            depth: playedMoveResult.payload.depth,
            pvUci: playedMoveResult.payload.pvUci
          };
        }
      }

      const plyRecord: PlyAnalysis = {
        id: createId(),
        userId: args.game.userId,
        runId: run.id,
        gameId: args.game.id,
        ply: step.ply,
        fen,
        playedMoveUci,
        playedMoveEvaluationType: playedMoveAnalysis?.evaluationType,
        playedMoveEvaluation: playedMoveAnalysis?.evaluation,
        playedMoveDepth: playedMoveAnalysis?.depth,
        playedMovePvUci: playedMoveAnalysis?.pvUci,
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
      args.onProgress?.({
        done,
        total: plan.length,
        lastCompletedPly: step.ply,
        totalPlies: args.game.movesUci.length
      });

      if (nowMs() - runStartedAt > foregroundBudgetMs) {
        console.warn("[analysis] foreground budget exceeded", {
          gameId: args.game.id,
          runId: run.id,
          elapsedMs: nowMs() - runStartedAt,
          budgetMs: foregroundBudgetMs
        });
        args.markCancelRequested();
        stoppedByBudget = true;
        break;
      }
    }

    const finishedRun = finalizeRun({
      run,
      outcome: args.isCancelRequested() ? "cancelled" : "completed",
      completedAt: nowIso(),
      retriesUsed: retriesUsedRef.value,
      stoppedByBudget,
      foregroundBudgetMs
    });

    console.log("[analysis] run finalized", {
      gameId: args.game.id,
      runId: finishedRun.id,
      status: finishedRun.status,
      done,
      retriesUsed: retriesUsedRef.value,
      stoppedByBudget
    });

    await args.saveRun(finishedRun);
    args.onRunUpdated?.(finishedRun);

    return {
      finalRun: finishedRun,
      done,
      retriesUsed: retriesUsedRef.value,
      stoppedByBudget
    };
  } catch (error) {
    const failedRun = finalizeRun({
      run,
      outcome: "failed",
      completedAt: nowIso(),
      failureMessage: error instanceof Error ? error.message : "Unknown analysis error"
    });

    console.error("[analysis] run failed", {
      gameId: args.game.id,
      runId: failedRun.id,
      error
    });

    await args.saveRun(failedRun);
    args.onRunUpdated?.(failedRun);

    return {
      finalRun: failedRun,
      done,
      retriesUsed: retriesUsedRef.value,
      stoppedByBudget
    };
  }
}
