import {
  ANALYSIS_COORDINATOR_CONFIG_DEFAULTS,
  normalizeAnalysisCoordinatorConfig
} from "../domain/analysisCoordinatorConfig.js";
import { buildReplayData } from "../domain/gameReplay.js";
import type { AnalysisCoordinatorConfig, AnalysisRun, GameRecord, PlyAnalysis } from "../domain/types.js";
import { EngineClient } from "../engine/engineClient.js";
import { SHIPPED_ENGINE_FLAVOR, type EngineFlavor } from "../engine/engineFlavorConfig.js";
import { formatUnknownError } from "../lib/formatUnknownError.js";
import { runtimeGateway } from "../lib/runtimeGateway.js";
import {
  runGameAnalysis,
  type AnalyzePositionInput,
  type AnalyzePositionResult,
  type RunGameAnalysisResult
} from "./runGameAnalysis.js";

export const BACKGROUND_ANALYSIS_INTERVAL_MS = ANALYSIS_COORDINATOR_CONFIG_DEFAULTS.intervalMs;

export type AnalysisCoordinatorMode = "foreground" | "background";

export type AnalysisCoordinatorSnapshot = {
  engineReady: boolean;
  initializing: boolean;
  running: boolean;
  activeGameId: string | null;
  mode: AnalysisCoordinatorMode | null;
  config: AnalysisCoordinatorConfig;
  status: string;
  progress: { done: number; total: number; lastCompletedPly: number | null; totalPlies: number } | null;
  error: string | null;
};

type EngineClientLike = {
  init: (flavor: EngineFlavor) => Promise<void>;
  analyzePosition: (input: AnalyzePositionInput) => Promise<AnalyzePositionResult>;
  cancel: () => Promise<void>;
};

type ActiveTask = {
  gameId: string;
  mode: AnalysisCoordinatorMode;
  cancelRequested: boolean;
};

export type AnalysisCoordinatorDeps = {
  createEngineClient: () => EngineClientLike;
  runGameAnalysis: (args: Parameters<typeof runGameAnalysis>[0]) => Promise<RunGameAnalysisResult>;
  listGames: () => Promise<GameRecord[]>;
  getGame: (gameId: string) => Promise<GameRecord | null>;
  hasCompletedRun: (gameId: string) => Promise<boolean>;
  saveRun: (run: AnalysisRun) => Promise<void>;
  savePly: (ply: PlyAnalysis) => Promise<void>;
  flushPendingPlies: (runId?: string) => Promise<void>;
  generatePuzzlesForRun: (runId: string, gameId: string) => Promise<number>;
  parseReplayData: typeof buildReplayData;
  chooseEngineFlavor: () => EngineFlavor;
  loadConfig: () => Promise<AnalysisCoordinatorConfig>;
  saveConfig: (config: AnalysisCoordinatorConfig) => Promise<void>;
  canPersistMutations: () => boolean;
  mutationGuardMessage: () => string;
  setIntervalFn: typeof setInterval;
  clearIntervalFn: typeof clearInterval;
};

function chooseEngineFlavor(): EngineFlavor {
  // Future builds can expand bundled flavors, but current prod/preview deploys intentionally ship only the lite single-thread engine.
  return SHIPPED_ENGINE_FLAVOR;
}

function formatBudgetLabel(budgetMs: number | undefined): string {
  if (!budgetMs) {
    return "n/a";
  }
  if (budgetMs % 1000 === 0) {
    return `${budgetMs / 1000}s`;
  }
  return `${budgetMs}ms`;
}

function defaultDeps(): AnalysisCoordinatorDeps {
  return {
    createEngineClient: () => new EngineClient(),
    runGameAnalysis,
    listGames: () => runtimeGateway.listGames(),
    getGame: (gameId) => runtimeGateway.getGame(gameId),
    hasCompletedRun: (gameId) => runtimeGateway.hasCompletedRun(gameId),
    saveRun: (run) => runtimeGateway.saveRun(run),
    savePly: (ply) => runtimeGateway.savePly(ply),
    flushPendingPlies: (runId) => runtimeGateway.flushPendingPlies(runId),
    generatePuzzlesForRun: (runId, gameId) => runtimeGateway.generatePuzzlesForRun(runId, gameId),
    parseReplayData: buildReplayData,
    chooseEngineFlavor,
    loadConfig: () => runtimeGateway.getAnalysisCoordinatorConfig(),
    saveConfig: (config) => runtimeGateway.saveAnalysisCoordinatorConfig(config),
    canPersistMutations: () => runtimeGateway.getSessionSnapshot().canMutate,
    mutationGuardMessage: () => runtimeGateway.mutationGuardMessage(),
    setIntervalFn: (handler, timeout) => window.setInterval(handler, timeout),
    clearIntervalFn: (intervalId) => window.clearInterval(intervalId)
  };
}

function formatGameLabel(game: GameRecord): string {
  return `${game.headers.White ?? "White"} vs ${game.headers.Black ?? "Black"}`;
}

function describeRunStatus(run: AnalysisRun, mode: AnalysisCoordinatorMode): string {
  const modeLabel = mode === "background" ? "Background analysis" : "Analysis";
  return `${modeLabel}: ${run.engineName} ${run.engineVersion} depth=${run.options.depth} movetime=${formatBudgetLabel(run.options.movetimeMs)} safety-limit=${formatBudgetLabel(run.options.foregroundBudgetMs)} status=${run.status}`;
}

function describeCompletion(args: {
  mode: AnalysisCoordinatorMode;
  result: RunGameAnalysisResult;
  createdPuzzles?: number;
  puzzleError?: string | null;
}): string {
  const prefix = args.mode === "background" ? "Background analysis" : "Analysis";
  if (args.result.finalRun.status === "completed") {
    const puzzleSuffix = args.puzzleError
      ? ` Puzzle generation failed: ${args.puzzleError}`
      : ` ${args.createdPuzzles ?? 0} puzzles generated.`;
    return `${prefix} completed. ${args.result.done} positions saved.${puzzleSuffix}`;
  }
  if (args.result.finalRun.status === "cancelled") {
    return `${prefix} cancelled.`;
  }
  return `${prefix} failed: ${args.result.finalRun.error ?? "Unknown analysis error"}`;
}

export class AnalysisCoordinator {
  private readonly listeners = new Set<() => void>();
  private readonly deps: AnalysisCoordinatorDeps;
  private snapshot: AnalysisCoordinatorSnapshot = {
    engineReady: false,
    initializing: false,
    running: false,
    activeGameId: null,
    mode: null,
    config: ANALYSIS_COORDINATOR_CONFIG_DEFAULTS,
    status: "Engine idle.",
    progress: null,
    error: null
  };
  private engine: EngineClientLike | null = null;
  private started = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private activeTask: ActiveTask | null = null;
  private pendingForegroundGameId: string | null = null;
  private backgroundScanInFlight = false;

  constructor(deps: Partial<AnalysisCoordinatorDeps> = {}) {
    this.deps = {
      ...defaultDeps(),
      ...deps
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): AnalysisCoordinatorSnapshot {
    return this.snapshot;
  }

  ensureStarted(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.engine = this.deps.createEngineClient();
    this.setSnapshot({
      initializing: true,
      status: "Initializing analysis engine...",
      error: null
    });

    void this.bootstrap();
  }

  async updateConfig(config: Partial<AnalysisCoordinatorConfig>): Promise<void> {
    if (!this.deps.canPersistMutations()) {
      throw new Error(this.deps.mutationGuardMessage());
    }

    const normalized = normalizeAnalysisCoordinatorConfig({
      ...this.snapshot.config,
      ...config
    });
    await this.deps.saveConfig(normalized);
    this.applyConfig(normalized);
  }

  async requestForegroundAnalysis(gameId: string): Promise<void> {
    if (!this.deps.canPersistMutations()) {
      const message = this.deps.mutationGuardMessage();
      this.setSnapshot({
        status: message,
        error: message
      });
      return;
    }

    this.ensureStarted();

    if (this.activeTask?.mode === "foreground" && this.activeTask.gameId === gameId) {
      return;
    }

    if (!this.snapshot.engineReady) {
      this.pendingForegroundGameId = gameId;
      this.setSnapshot({
        status: "Waiting for engine initialization before starting analysis...",
        error: null
      });
      return;
    }

    this.pendingForegroundGameId = gameId;
    if (this.activeTask) {
      this.setSnapshot({
        status: "Foreground analysis requested. Cancelling the current run...",
        error: null
      });
      await this.cancelActiveAnalysis();
      return;
    }

    this.pendingForegroundGameId = null;
    await this.startForegroundById(gameId);
  }

  async cancelActiveAnalysis(): Promise<void> {
    if (!this.activeTask) {
      return;
    }

    this.activeTask.cancelRequested = true;
    this.setSnapshot({
      status: "Cancelling analysis...",
      error: null
    });

    try {
      await this.engine?.cancel();
    } catch (error) {
      console.warn("[analysisCoordinator] failed to cancel engine", {
        activeGameId: this.activeTask.gameId,
        error
      });
    }
  }

  private setSnapshot(patch: Partial<AnalysisCoordinatorSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...patch
    };
    for (const listener of this.listeners) {
      listener();
    }
  }

  private async bootstrap(): Promise<void> {
    try {
      const persistedConfig = await this.deps.loadConfig();
      this.applyConfig(persistedConfig, { allowBackgroundStart: false });
    } catch (error) {
      const message = formatUnknownError(error, "Failed to load lazy-analysis settings");
      this.setSnapshot({
        config: ANALYSIS_COORDINATOR_CONFIG_DEFAULTS,
        status: `Using default lazy-analysis settings. ${message}`,
        error: message
      });
      this.applyConfig(ANALYSIS_COORDINATOR_CONFIG_DEFAULTS, { allowBackgroundStart: false });
    }

    await this.initializeEngine();
  }

  private applyConfig(
    config: AnalysisCoordinatorConfig,
    options: { allowBackgroundStart?: boolean } = {}
  ): void {
    const nextConfig = normalizeAnalysisCoordinatorConfig(config);
    if (this.intervalId) {
      this.deps.clearIntervalFn(this.intervalId);
      this.intervalId = null;
    }

    if (nextConfig.enabled) {
      this.intervalId = this.deps.setIntervalFn(() => {
        void this.maybeStartBackgroundAnalysis("interval");
      }, nextConfig.intervalMs);
    }

    this.setSnapshot({
      config: nextConfig
    });

    if (!nextConfig.enabled && this.activeTask?.mode === "background") {
      void this.cancelActiveAnalysis();
    }

    if (nextConfig.enabled && options.allowBackgroundStart !== false && this.snapshot.engineReady && !this.activeTask && !this.pendingForegroundGameId) {
      void this.maybeStartBackgroundAnalysis("config");
    }
  }

  private async initializeEngine(): Promise<void> {
    try {
      await this.engine?.init(this.deps.chooseEngineFlavor());
      this.setSnapshot({
        engineReady: true,
        initializing: false,
        status: this.snapshot.config.enabled
          ? "Engine ready. Looking for library games to analyze."
          : "Engine ready. Background library analysis is disabled.",
        error: null
      });

      if (this.pendingForegroundGameId) {
        const nextGameId = this.pendingForegroundGameId;
        this.pendingForegroundGameId = null;
        await this.startForegroundById(nextGameId);
        return;
      }

      if (this.snapshot.config.enabled) {
        await this.maybeStartBackgroundAnalysis("engine-ready");
      }
    } catch (error) {
      const message = formatUnknownError(error, "Engine initialization failed");
      this.setSnapshot({
        engineReady: false,
        initializing: false,
        status: `Engine initialization failed: ${message}`,
        error: message
      });
    }
  }

  private async maybeStartBackgroundAnalysis(reason: "config" | "engine-ready" | "interval"): Promise<void> {
    if (
      !this.started ||
      !this.snapshot.engineReady ||
      !this.snapshot.config.enabled ||
      this.activeTask ||
      this.pendingForegroundGameId ||
      this.backgroundScanInFlight
    ) {
      return;
    }

    if (!this.deps.canPersistMutations()) {
      return;
    }

    this.backgroundScanInFlight = true;
    try {
      const games = await this.deps.listGames();
      for (const game of games) {
        if (this.activeTask || this.pendingForegroundGameId) {
          return;
        }

        const hasCompletedRun = await this.deps.hasCompletedRun(game.id);
        if (!hasCompletedRun) {
          console.log("[analysisCoordinator] starting background analysis", {
            gameId: game.id,
            reason
          });
          await this.startAnalysis(game, "background");
          return;
        }
      }

      this.setSnapshot({
        status: "Engine ready. No unanalyzed games in the library.",
        error: null,
        progress: null
      });
    } catch (error) {
      const message = formatUnknownError(error, "Background analysis scan failed");
      this.setSnapshot({
        status: `Background scan failed: ${message}`,
        error: message
      });
    } finally {
      this.backgroundScanInFlight = false;
    }
  }

  private async startForegroundById(gameId: string): Promise<void> {
    const game = await this.deps.getGame(gameId);
    if (!game) {
      this.setSnapshot({
        status: "Requested game was not found.",
        error: "Requested game was not found."
      });
      return;
    }

    await this.startAnalysis(game, "foreground");
  }

  private async startAnalysis(game: GameRecord, mode: AnalysisCoordinatorMode): Promise<void> {
    if (this.activeTask || !this.engine) {
      return;
    }

    let replayData: ReturnType<typeof buildReplayData>;
    try {
      replayData = this.deps.parseReplayData(game.pgn, game.initialFen);
    } catch (error) {
      const message = formatUnknownError(error, "Failed to parse game PGN");
      this.setSnapshot({
        status: `Unable to start analysis for ${formatGameLabel(game)}: ${message}`,
        error: message
      });
      return;
    }

    const task: ActiveTask = {
      gameId: game.id,
      mode,
      cancelRequested: false
    };
    this.activeTask = task;
    this.setSnapshot({
      running: true,
      activeGameId: game.id,
      mode,
      progress: null,
      error: null,
      status: mode === "background"
        ? `Background analysis started for ${formatGameLabel(game)}.`
        : `Starting analysis for ${formatGameLabel(game)}...`
    });

    let result: RunGameAnalysisResult | null = null;
    let puzzleError: string | null = null;
    let createdPuzzles = 0;

    try {
      result = await this.deps.runGameAnalysis({
        game,
        fenPositions: replayData.fenPositions,
        moveSanList: replayData.moves.map((move) => move.san),
        engineFlavor: this.deps.chooseEngineFlavor(),
        analyzePosition: (input) => this.engine!.analyzePosition(input),
        saveRun: this.deps.saveRun,
        savePly: this.deps.savePly,
        isCancelRequested: () => task.cancelRequested,
        markCancelRequested: () => {
          task.cancelRequested = true;
        },
        onProgress: (progress) => {
          if (this.activeTask !== task) {
            return;
          }
          this.setSnapshot({
            progress,
            status: mode === "background"
              ? `Background analysis: ply ${progress.lastCompletedPly ?? 0}/${progress.totalPlies}`
              : `Analysis progress: ply ${progress.lastCompletedPly ?? 0}/${progress.totalPlies}`
          });
        },
        onRetryStatus: (message) => {
          if (this.activeTask !== task) {
            return;
          }
          this.setSnapshot({
            status: mode === "background" ? `Background analysis: ${message}` : message
          });
        },
        onRunUpdated: (run) => {
          if (this.activeTask !== task) {
            return;
          }
          this.setSnapshot({
            status: describeRunStatus(run, mode)
          });
        },
        onPlySaved: (ply) => {
          if (this.activeTask !== task) {
            return;
          }
          this.setSnapshot({
            status: mode === "background"
              ? `Background analysis saved ply ${ply.ply}/${game.movesUci.length}`
              : `Analyzed ply ${ply.ply}/${game.movesUci.length}`
          });
        }
      });

      await this.deps.flushPendingPlies(result.finalRun.id);

      if (result.finalRun.status === "completed") {
        try {
          createdPuzzles = await this.deps.generatePuzzlesForRun(result.finalRun.id, game.id);
        } catch (error) {
          puzzleError = formatUnknownError(error, "Puzzle generation failed");
        }
      }
    } catch (error) {
      await this.deps.flushPendingPlies().catch((flushError) => {
        console.warn("[analysisCoordinator] failed to flush pending plies after analysis error", flushError);
      });
      const message = formatUnknownError(error, "Analysis failed");
      this.setSnapshot({
        running: false,
        activeGameId: null,
        mode: null,
        progress: null,
        status: `Analysis failed: ${message}`,
        error: message
      });
      this.activeTask = null;
      await this.flushPendingForegroundRequest();
      return;
    }

    const finalResult = result;
    this.activeTask = null;
    this.setSnapshot({
      running: false,
      activeGameId: null,
      mode: null,
      progress: null,
      status: finalResult
        ? describeCompletion({
            mode,
            result: finalResult,
            createdPuzzles,
            puzzleError
          })
        : "Analysis stopped.",
      error: finalResult?.finalRun.status === "failed"
        ? finalResult.finalRun.error ?? "Analysis failed."
        : puzzleError
    });

    await this.flushPendingForegroundRequest();
  }

  private async flushPendingForegroundRequest(): Promise<void> {
    if (!this.pendingForegroundGameId) {
      return;
    }

    const nextGameId = this.pendingForegroundGameId;
    this.pendingForegroundGameId = null;
    await this.startForegroundById(nextGameId);
  }

  disposeForTests(): void {
    if (this.intervalId) {
      this.deps.clearIntervalFn(this.intervalId);
      this.intervalId = null;
    }
    this.started = false;
    this.engine = null;
    this.activeTask = null;
    this.pendingForegroundGameId = null;
    this.backgroundScanInFlight = false;
    this.listeners.clear();
    this.snapshot = {
      engineReady: false,
      initializing: false,
      running: false,
      activeGameId: null,
      mode: null,
      config: ANALYSIS_COORDINATOR_CONFIG_DEFAULTS,
      status: "Engine idle.",
      progress: null,
      error: null
    };
  }
}

export const sharedAnalysisCoordinator = new AnalysisCoordinator();
