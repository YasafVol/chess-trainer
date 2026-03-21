import { CHESS_COM_SYNC_CONFIG_DEFAULTS, isChessComSyncDue, normalizeChessComSyncConfig } from "../domain/chessComSyncConfig.js";
import type { ChessComImportResult, ChessComSyncConfig } from "../domain/types.js";
import { formatUnknownError } from "../lib/formatUnknownError.js";
import { getChessComSyncConfig, saveChessComSyncConfig } from "../lib/storage/repositories/appMetaRepo.js";
import { syncChessComArchives } from "./chessComImport.js";

export const CHESS_COM_SYNC_POLL_INTERVAL_MS = 60_000;

export type ChessComSyncCoordinatorSnapshot = {
  running: boolean;
  config: ChessComSyncConfig;
  status: string;
  error: string | null;
};

export type ChessComSyncCoordinatorDeps = {
  loadConfig: () => Promise<ChessComSyncConfig>;
  saveConfig: (config: ChessComSyncConfig) => Promise<void>;
  syncArchives: (config: ChessComSyncConfig) => Promise<ChessComImportResult>;
  setIntervalFn: typeof setInterval;
  clearIntervalFn: typeof clearInterval;
  now: () => Date;
};

function defaultDeps(): ChessComSyncCoordinatorDeps {
  return {
    loadConfig: getChessComSyncConfig,
    saveConfig: saveChessComSyncConfig,
    syncArchives: syncChessComArchives,
    setIntervalFn: (handler, timeout) => window.setInterval(handler, timeout),
    clearIntervalFn: (intervalId) => window.clearInterval(intervalId),
    now: () => new Date()
  };
}

function mergeConfig(
  current: ChessComSyncConfig,
  patch: Partial<ChessComSyncConfig>
): ChessComSyncConfig {
  return normalizeChessComSyncConfig({
    ...current,
    ...patch
  });
}

function formatIdleStatus(config: ChessComSyncConfig): string {
  if (!config.username) {
    return "Chess.com sync is not configured.";
  }
  if (!config.enabled) {
    return "Chess.com sync is disabled.";
  }
  if (!config.lastSuccessfulArchive) {
    return "Run a manual Chess.com import to establish the initial archive cursor.";
  }
  return config.lastStatus ?? "Waiting for the next Chess.com sync window.";
}

export class ChessComSyncCoordinator {
  private readonly deps: ChessComSyncCoordinatorDeps;
  private readonly listeners = new Set<() => void>();
  private snapshot: ChessComSyncCoordinatorSnapshot = {
    running: false,
    config: CHESS_COM_SYNC_CONFIG_DEFAULTS,
    status: "Loading Chess.com sync settings...",
    error: null
  };
  private started = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private syncInFlight = false;

  constructor(deps: Partial<ChessComSyncCoordinatorDeps> = {}) {
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

  getSnapshot(): ChessComSyncCoordinatorSnapshot {
    return this.snapshot;
  }

  ensureStarted(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    void this.bootstrap();
  }

  async updateConfig(patch: Partial<ChessComSyncConfig>): Promise<void> {
    const nextConfig = mergeConfig(this.snapshot.config, patch);
    await this.deps.saveConfig(nextConfig);
    this.applyConfig(nextConfig);

    if (nextConfig.enabled && nextConfig.username && nextConfig.lastSuccessfulArchive && isChessComSyncDue(nextConfig, this.deps.now())) {
      void this.maybeRunDueSync("config");
    }
  }

  async applyManualImportResult(result: ChessComImportResult): Promise<void> {
    const nextConfig = mergeConfig(this.snapshot.config, {
      lastSuccessfulArchive: result.latestProcessedArchive ?? this.snapshot.config.lastSuccessfulArchive,
      lastStatus: result.statusMessage
    });
    await this.deps.saveConfig(nextConfig);
    this.applyConfig(nextConfig);
  }

  private setSnapshot(patch: Partial<ChessComSyncCoordinatorSnapshot>): void {
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
      const config = await this.deps.loadConfig();
      this.applyConfig(config);
      await this.maybeRunDueSync("bootstrap");
    } catch (error) {
      const message = formatUnknownError(error, "Failed to load Chess.com sync settings");
      this.setSnapshot({
        config: CHESS_COM_SYNC_CONFIG_DEFAULTS,
        status: `Using default Chess.com sync settings. ${message}`,
        error: message
      });
    }
  }

  private applyConfig(config: ChessComSyncConfig): void {
    const nextConfig = normalizeChessComSyncConfig(config);
    if (this.intervalId) {
      this.deps.clearIntervalFn(this.intervalId);
      this.intervalId = null;
    }

    this.intervalId = this.deps.setIntervalFn(() => {
      void this.maybeRunDueSync("interval");
    }, CHESS_COM_SYNC_POLL_INTERVAL_MS);

    this.setSnapshot({
      config: nextConfig,
      status: this.snapshot.running ? this.snapshot.status : formatIdleStatus(nextConfig),
      error: null
    });
  }

  private async maybeRunDueSync(reason: "bootstrap" | "interval" | "config"): Promise<void> {
    if (this.syncInFlight) {
      return;
    }

    const config = this.snapshot.config;
    if (!config.enabled || !config.username) {
      return;
    }
    if (!config.lastSuccessfulArchive) {
      this.setSnapshot({
        status: formatIdleStatus(config),
        error: null
      });
      return;
    }
    if (!isChessComSyncDue(config, this.deps.now())) {
      if (reason === "bootstrap") {
        this.setSnapshot({
          status: formatIdleStatus(config),
          error: null
        });
      }
      return;
    }

    this.syncInFlight = true;
    this.setSnapshot({
      running: true,
      status: "Syncing new Chess.com archive months...",
      error: null
    });

    try {
      const result = await this.deps.syncArchives(config);
      const attemptedAt = this.deps.now().toISOString();
      const nextConfig = mergeConfig(config, {
        lastSyncAt: attemptedAt,
        lastSuccessfulArchive: result.latestProcessedArchive ?? config.lastSuccessfulArchive,
        lastStatus: result.statusMessage
      });
      await this.deps.saveConfig(nextConfig);
      this.setSnapshot({
        running: false,
        config: nextConfig,
        status: result.statusMessage,
        error: null
      });
    } catch (error) {
      const message = formatUnknownError(error, "Chess.com sync failed");
      const attemptedAt = this.deps.now().toISOString();
      const nextConfig = mergeConfig(config, {
        lastSyncAt: attemptedAt,
        lastStatus: `Chess.com sync failed: ${message}`
      });
      await this.deps.saveConfig(nextConfig);
      this.setSnapshot({
        running: false,
        config: nextConfig,
        status: nextConfig.lastStatus ?? "Chess.com sync failed.",
        error: message
      });
    } finally {
      this.syncInFlight = false;
    }
  }
}

export const sharedChessComSyncCoordinator = new ChessComSyncCoordinator();
