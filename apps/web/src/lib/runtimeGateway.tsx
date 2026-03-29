import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useConvexConnectionState, useQuery } from "convex/react";
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buildPuzzleStats, nextReviewOrder, normalizePuzzleRecord } from "../domain/puzzles.js";
import type {
  AnalysisCoordinatorConfig,
  AnalysisRun,
  ChessComSyncConfig,
  GameRecord,
  ImportBatchResult,
  PlyAnalysis,
  Puzzle,
  PuzzleAttempt,
  PuzzlePlaybackConfig,
  PuzzleStats,
  SessionUser
} from "../domain/types.js";
import {
  type AnalysisSnapshot,
  convexApi,
  type ImportedGameInput,
  type PersistedPuzzleAttemptInput
} from "./convex.js";
import {
  getLatestAnalysisRunByGameId,
  hasCompletedAnalysisRunForGameId,
  listPlyAnalysisByRunId,
  saveAnalysisRun,
  savePlyAnalysis
} from "./storage/repositories/analysisRepo.js";
import {
  getAnalysisCoordinatorConfig,
  getChessComSyncConfig,
  getPuzzlePlaybackConfig,
  saveAnalysisCoordinatorConfig,
  saveChessComSyncConfig,
  savePuzzlePlaybackConfig
} from "./storage/repositories/appMetaRepo.js";
import { getGame, listGames, saveGame } from "./storage/repositories/gamesRepo.js";
import {
  getPuzzle,
  listPuzzleAttempts,
  listPuzzleAttemptsByPuzzleId,
  listPuzzles,
  savePuzzle,
  savePuzzleAttempt
} from "./storage/repositories/puzzlesRepo.js";

const MUTATION_REQUIRES_SESSION = "This action requires a signed-in online session.";
const ANALYSIS_BATCH_SIZE = 8;
const convexUrl = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env?.VITE_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export type RuntimeSessionSnapshot = {
  isConfigured: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: SessionUser | null;
  browserOnline: boolean;
  backendConnected: boolean;
  canMutate: boolean;
};

function currentBrowserOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function defaultSessionSnapshot(): RuntimeSessionSnapshot {
  return {
    isConfigured: !!convexClient,
    isLoading: !!convexClient,
    isAuthenticated: false,
    user: null,
    browserOnline: currentBrowserOnline(),
    backendConnected: false,
    canMutate: false
  };
}

type ResourceListener = () => void;

class RuntimeGateway {
  private readonly sessionListeners = new Set<ResourceListener>();
  private readonly dataListeners = new Set<ResourceListener>();
  private sessionSnapshot = defaultSessionSnapshot();
  private pendingPlies = new Map<string, PlyAnalysis[]>();
  private inflightPlyFlushes = new Map<string, Promise<void>>();

  subscribeSession(listener: ResourceListener): () => void {
    this.sessionListeners.add(listener);
    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  subscribeData(listener: ResourceListener): () => void {
    this.dataListeners.add(listener);
    return () => {
      this.dataListeners.delete(listener);
    };
  }

  getSessionSnapshot(): RuntimeSessionSnapshot {
    return this.sessionSnapshot;
  }

  updateSession(patch: Partial<RuntimeSessionSnapshot>): void {
    const nextBase = {
      ...this.sessionSnapshot,
      ...patch
    };
    const next: RuntimeSessionSnapshot = {
      ...nextBase,
      canMutate: Boolean(
        nextBase.isConfigured &&
          nextBase.isAuthenticated &&
          nextBase.user &&
          nextBase.browserOnline &&
          nextBase.backendConnected &&
          !nextBase.isLoading
      )
    };

    const unchanged = JSON.stringify(next) === JSON.stringify(this.sessionSnapshot);
    if (unchanged) {
      return;
    }

    this.sessionSnapshot = next;
    for (const listener of this.sessionListeners) {
      listener();
    }
  }

  emitDataChange(): void {
    for (const listener of this.dataListeners) {
      listener();
    }
  }

  mutationGuardMessage(): string {
    if (!this.sessionSnapshot.isConfigured) {
      return "Convex is not configured. Set VITE_CONVEX_URL before using the app.";
    }
    if (!this.sessionSnapshot.isAuthenticated) {
      return "Sign in to save changes.";
    }
    if (!this.sessionSnapshot.browserOnline || !this.sessionSnapshot.backendConnected) {
      return "Reconnect to save changes. Offline mode is view-only.";
    }
    if (!this.sessionSnapshot.user) {
      return "Loading your account. Try again in a moment.";
    }
    return MUTATION_REQUIRES_SESSION;
  }

  ensureMutationAllowed(): void {
    if (!this.sessionSnapshot.canMutate) {
      throw new Error(this.mutationGuardMessage());
    }
  }

  private shouldUseRemoteReads(): boolean {
    return Boolean(
      this.sessionSnapshot.isConfigured &&
        this.sessionSnapshot.isAuthenticated &&
        this.sessionSnapshot.browserOnline &&
        this.sessionSnapshot.backendConnected
    );
  }

  private async queryRemote<Result>(ref: unknown, args: Record<string, unknown>): Promise<Result> {
    if (!convexClient) {
      throw new Error("Convex client is not configured.");
    }
    return convexClient.query(ref as never, args as never) as Promise<Result>;
  }

  private async mutateRemote<Result>(ref: unknown, args: Record<string, unknown>): Promise<Result> {
    if (!convexClient) {
      throw new Error("Convex client is not configured.");
    }
    return convexClient.mutation(ref as never, args as never) as Promise<Result>;
  }

  private async withCacheFallback<T>(loadRemote: () => Promise<T>, loadCache: () => Promise<T>): Promise<T> {
    if (!this.sessionSnapshot.isAuthenticated) {
      return loadCache();
    }

    if (!this.shouldUseRemoteReads()) {
      return loadCache();
    }

    try {
      return await loadRemote();
    } catch (error) {
      console.warn("[runtime] falling back to cache after remote read failed", error);
      return loadCache();
    }
  }

  private async cacheGames(games: GameRecord[]): Promise<void> {
    for (const game of games) {
      await saveGame(game);
    }
  }

  private async cacheAnalysisSnapshot(snapshot: AnalysisSnapshot): Promise<void> {
    if (snapshot.run) {
      await saveAnalysisRun(snapshot.run);
    }
    for (const ply of snapshot.plies) {
      await savePlyAnalysis(ply);
    }
  }

  private async cachePuzzles(puzzles: Puzzle[]): Promise<void> {
    for (const puzzle of puzzles) {
      await savePuzzle(normalizePuzzleRecord(puzzle));
    }
  }

  private async cachePuzzleAttempts(attempts: PuzzleAttempt[]): Promise<void> {
    for (const attempt of attempts) {
      await savePuzzleAttempt(attempt);
    }
  }

  async listGames(): Promise<GameRecord[]> {
    return this.withCacheFallback(
      async () => {
        const games = await this.queryRemote<GameRecord[]>(convexApi.games.list, {});
        await this.cacheGames(games);
        return games;
      },
      async () => listGames()
    );
  }

  async getGame(gameId: string): Promise<GameRecord | null> {
    return this.withCacheFallback(
      async () => {
        const game = await this.queryRemote<GameRecord | null>(convexApi.games.get, { gameId });
        if (game) {
          await saveGame(game);
        }
        return game;
      },
      async () => getGame(gameId)
    );
  }

  async getAnalysisSnapshot(gameId: string): Promise<AnalysisSnapshot> {
    return this.withCacheFallback(
      async () => {
        const snapshot = await this.queryRemote<AnalysisSnapshot>(convexApi.analysis.snapshot, { gameId });
        await this.cacheAnalysisSnapshot(snapshot);
        return snapshot;
      },
      async () => {
        const run = await getLatestAnalysisRunByGameId(gameId);
        const plies = run ? await listPlyAnalysisByRunId(run.id) : [];
        return { run, plies };
      }
    );
  }

  async hasCompletedRun(gameId: string): Promise<boolean> {
    return this.withCacheFallback(
      async () => this.queryRemote<boolean>(convexApi.analysis.hasCompletedForGame, { gameId }),
      async () => hasCompletedAnalysisRunForGameId(gameId)
    );
  }

  async listPuzzles(): Promise<Puzzle[]> {
    return this.withCacheFallback(
      async () => {
        const puzzles = await this.queryRemote<Puzzle[]>(convexApi.puzzles.list, {});
        await this.cachePuzzles(puzzles);
        return puzzles;
      },
      async () => nextReviewOrder(await listPuzzles())
    );
  }

  async getPuzzleBank(): Promise<{ puzzles: Puzzle[]; attempts: PuzzleAttempt[] }> {
    return this.withCacheFallback(
      async () => {
        const [puzzles, attempts] = await Promise.all([
          this.queryRemote<Puzzle[]>(convexApi.puzzles.list, {}),
          this.queryRemote<PuzzleAttempt[]>(convexApi.puzzles.listAttempts, {})
        ]);
        await Promise.all([this.cachePuzzles(puzzles), this.cachePuzzleAttempts(attempts)]);
        return { puzzles, attempts };
      },
      async () => ({
        puzzles: await listPuzzles(),
        attempts: await listPuzzleAttempts()
      })
    );
  }

  async getPuzzleDetails(puzzleId: string): Promise<{ puzzle: Puzzle | null; attempts: PuzzleAttempt[]; stats: PuzzleStats | null }> {
    return this.withCacheFallback(
      async () => {
        const details = await this.queryRemote<{ puzzle: Puzzle | null; attempts: PuzzleAttempt[]; stats: PuzzleStats | null }>(
          convexApi.puzzles.get,
          { puzzleId }
        );
        if (details.puzzle) {
          await savePuzzle(normalizePuzzleRecord(details.puzzle));
        }
        await this.cachePuzzleAttempts(details.attempts);
        return details;
      },
      async () => {
        const puzzle = await getPuzzle(puzzleId);
        const attempts = await listPuzzleAttemptsByPuzzleId(puzzleId);
        return {
          puzzle,
          attempts,
          stats: puzzle ? buildPuzzleStats(puzzle, attempts) : null
        };
      }
    );
  }

  async importGames(games: ImportedGameInput[]): Promise<ImportBatchResult> {
    this.ensureMutationAllowed();
    const result = await this.mutateRemote<ImportBatchResult>(convexApi.games.importBatch, { games });
    try {
      const refreshedGames = await this.queryRemote<GameRecord[]>(convexApi.games.list, {});
      await this.cacheGames(refreshedGames);
    } catch (error) {
      console.warn("[runtime] failed to refresh games cache after import", error);
    }
    this.emitDataChange();
    return result;
  }

  async saveRun(run: AnalysisRun): Promise<void> {
    this.ensureMutationAllowed();
    await this.mutateRemote(convexApi.analysis.saveRun, {
      run: {
        id: run.id,
        gameId: run.gameId,
        schemaVersion: run.schemaVersion,
        engineName: run.engineName,
        engineVersion: run.engineVersion,
        engineFlavor: run.engineFlavor,
        options: run.options,
        status: run.status,
        progressDone: run.progressDone,
        progressTotal: run.progressTotal,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        error: run.error
      }
    });
    await saveAnalysisRun(run);
    this.emitDataChange();
  }

  async savePly(ply: PlyAnalysis): Promise<void> {
    this.ensureMutationAllowed();
    const batch = this.pendingPlies.get(ply.runId) ?? [];
    batch.push(ply);
    this.pendingPlies.set(ply.runId, batch);

    if (batch.length >= ANALYSIS_BATCH_SIZE) {
      await this.flushPendingPlies(ply.runId);
    }
  }

  async flushPendingPlies(runId?: string): Promise<void> {
    const runIds = runId ? [runId] : Array.from(this.pendingPlies.keys());
    await Promise.all(runIds.map(async (nextRunId) => {
      const pending = this.pendingPlies.get(nextRunId) ?? [];
      if (pending.length === 0) {
        return;
      }

      const inflight = this.inflightPlyFlushes.get(nextRunId);
      if (inflight) {
        await inflight;
        return;
      }

      const payload = [...pending];
      this.pendingPlies.delete(nextRunId);
      const flushPromise = (async () => {
        await this.mutateRemote(convexApi.analysis.savePlies, {
          plies: payload.map((ply) => ({
            id: ply.id,
            runId: ply.runId,
            gameId: ply.gameId,
            ply: ply.ply,
            fen: ply.fen,
            playedMoveUci: ply.playedMoveUci,
            playedMoveEvaluationType: ply.playedMoveEvaluationType,
            playedMoveEvaluation: ply.playedMoveEvaluation,
            playedMoveDepth: ply.playedMoveDepth,
            playedMovePvUci: ply.playedMovePvUci,
            bestMoveUci: ply.bestMoveUci,
            evaluationType: ply.evaluationType,
            evaluation: ply.evaluation,
            depth: ply.depth,
            nodes: ply.nodes,
            nps: ply.nps,
            timeMs: ply.timeMs,
            pvUci: ply.pvUci
          }))
        });

        for (const ply of payload) {
          await savePlyAnalysis(ply);
        }
      })().finally(() => {
        this.inflightPlyFlushes.delete(nextRunId);
      });

      this.inflightPlyFlushes.set(nextRunId, flushPromise);
      await flushPromise;
    }));

    this.emitDataChange();
  }

  async generatePuzzlesForRun(runId: string, gameId: string): Promise<number> {
    this.ensureMutationAllowed();
    const result = await this.mutateRemote<{ created: number }>(convexApi.puzzles.generateForRun, { runId, gameId });
    try {
      const [puzzles, attempts] = await Promise.all([
        this.queryRemote<Puzzle[]>(convexApi.puzzles.list, {}),
        this.queryRemote<PuzzleAttempt[]>(convexApi.puzzles.listAttempts, {})
      ]);
      await Promise.all([this.cachePuzzles(puzzles), this.cachePuzzleAttempts(attempts)]);
    } catch (error) {
      console.warn("[runtime] failed to refresh puzzle cache after generation", error);
    }
    this.emitDataChange();
    return result.created;
  }

  async getAnalysisCoordinatorConfig(): Promise<AnalysisCoordinatorConfig> {
    return this.withCacheFallback(
      async () => {
        const config = await this.queryRemote<AnalysisCoordinatorConfig>(convexApi.appMeta.getAnalysisCoordinatorConfig, {});
        await saveAnalysisCoordinatorConfig(config);
        return config;
      },
      async () => getAnalysisCoordinatorConfig()
    );
  }

  async saveAnalysisCoordinatorConfig(config: AnalysisCoordinatorConfig): Promise<void> {
    this.ensureMutationAllowed();
    const saved = await this.mutateRemote<AnalysisCoordinatorConfig>(convexApi.appMeta.saveAnalysisCoordinatorConfig, { config });
    await saveAnalysisCoordinatorConfig(saved);
    this.emitDataChange();
  }

  async getPuzzlePlaybackConfig(): Promise<PuzzlePlaybackConfig> {
    return this.withCacheFallback(
      async () => {
        const config = await this.queryRemote<PuzzlePlaybackConfig>(convexApi.appMeta.getPuzzlePlaybackConfig, {});
        await savePuzzlePlaybackConfig(config);
        return config;
      },
      async () => getPuzzlePlaybackConfig()
    );
  }

  async savePuzzlePlaybackConfig(config: PuzzlePlaybackConfig): Promise<void> {
    this.ensureMutationAllowed();
    const saved = await this.mutateRemote<PuzzlePlaybackConfig>(convexApi.appMeta.savePuzzlePlaybackConfig, { config });
    await savePuzzlePlaybackConfig(saved);
    this.emitDataChange();
  }

  async getChessComSyncConfig(): Promise<ChessComSyncConfig> {
    return this.withCacheFallback(
      async () => {
        const config = await this.queryRemote<ChessComSyncConfig>(convexApi.appMeta.getChessComSyncConfig, {});
        await saveChessComSyncConfig(config);
        return config;
      },
      async () => getChessComSyncConfig()
    );
  }

  async saveChessComSyncConfig(config: ChessComSyncConfig): Promise<void> {
    this.ensureMutationAllowed();
    const saved = await this.mutateRemote<ChessComSyncConfig>(convexApi.appMeta.saveChessComSyncConfig, { config });
    await saveChessComSyncConfig(saved);
    this.emitDataChange();
  }

  async recordPuzzleAttempt(attempt: PersistedPuzzleAttemptInput): Promise<void> {
    this.ensureMutationAllowed();
    await this.mutateRemote(convexApi.puzzles.recordAttempt, attempt as PersistedPuzzleAttemptInput & { puzzleId: string });
    try {
      const details = await this.queryRemote<{ puzzle: Puzzle | null; attempts: PuzzleAttempt[]; stats: PuzzleStats | null }>(
        convexApi.puzzles.get,
        { puzzleId: attempt.puzzleId }
      );
      if (details.puzzle) {
        await savePuzzle(normalizePuzzleRecord(details.puzzle));
      }
      await this.cachePuzzleAttempts(details.attempts);
    } catch (error) {
      console.warn("[runtime] failed to refresh puzzle cache after attempt", error);
    }
    this.emitDataChange();
  }
}

export const runtimeGateway = new RuntimeGateway();

function RuntimeGatewaySync({ children }: { children: ReactNode }) {
  const auth = useConvexAuth();
  const connection = useConvexConnectionState();
  const user = useQuery(convexApi.users.current, auth.isAuthenticated ? {} : "skip");
  const [browserOnline, setBrowserOnline] = useState(currentBrowserOnline);
  const sessionUser = auth.isAuthenticated ? user ?? null : null;

  useEffect(() => {
    const handleNetworkChange = () => {
      setBrowserOnline(currentBrowserOnline());
    };

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);
    return () => {
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
    };
  }, []);

  useEffect(() => {
    runtimeGateway.updateSession({
      isConfigured: !!convexClient,
      isLoading: auth.isLoading || (auth.isAuthenticated && user === undefined),
      isAuthenticated: auth.isAuthenticated,
      user: sessionUser,
      browserOnline,
      backendConnected: connection.isWebSocketConnected
    });
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    browserOnline,
    connection.isWebSocketConnected,
    sessionUser,
    user
  ]);

  return <>{children}</>;
}

export function AppRuntimeProviders({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return <RuntimeGatewayStaticSync>{children}</RuntimeGatewayStaticSync>;
  }

  return (
    <ConvexAuthProvider client={convexClient}>
      <RuntimeGatewaySync>{children}</RuntimeGatewaySync>
    </ConvexAuthProvider>
  );
}

function RuntimeGatewayStaticSync({ children }: { children: ReactNode }) {
  useEffect(() => {
    runtimeGateway.updateSession({
      isConfigured: false,
      isLoading: false,
      isAuthenticated: false,
      user: null,
      browserOnline: currentBrowserOnline(),
      backendConnected: false
    });
  }, []);

  return <>{children}</>;
}

export function useRuntimeSession(): RuntimeSessionSnapshot {
  return useSyncExternalStore(
    (listener) => runtimeGateway.subscribeSession(listener),
    () => runtimeGateway.getSessionSnapshot()
  );
}

function useRuntimeResource<T>(load: () => Promise<T>, deps: unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => runtimeGateway.subscribeData(() => setVersion((current) => current + 1)), []);
  useEffect(() => runtimeGateway.subscribeSession(() => setVersion((current) => current + 1)), []);

  useEffect(() => {
    let active = true;
    setValue(undefined);
    void loadRef.current().then((next) => {
      if (active) {
        setValue(next);
      }
    });
    return () => {
      active = false;
    };
  }, [version, ...deps]);

  return value;
}

export function useGames() {
  const session = useRuntimeSession();
  return useRuntimeResource(
    () => (session.isAuthenticated ? runtimeGateway.listGames() : Promise.resolve([])),
    [session.isAuthenticated, session.browserOnline, session.backendConnected, session.isConfigured]
  );
}

export function useGame(gameId: string) {
  const session = useRuntimeSession();
  return useRuntimeResource(
    () => (session.isAuthenticated && gameId ? runtimeGateway.getGame(gameId) : Promise.resolve(null)),
    [gameId, session.isAuthenticated, session.browserOnline, session.backendConnected, session.isConfigured]
  );
}

export function useAnalysisSnapshot(gameId: string) {
  const session = useRuntimeSession();
  return useRuntimeResource(
    () => (session.isAuthenticated && gameId ? runtimeGateway.getAnalysisSnapshot(gameId) : Promise.resolve({ run: null, plies: [] })),
    [gameId, session.isAuthenticated, session.browserOnline, session.backendConnected, session.isConfigured]
  );
}

export function usePuzzles() {
  const session = useRuntimeSession();
  return useRuntimeResource(
    () => (session.isAuthenticated ? runtimeGateway.listPuzzles() : Promise.resolve([])),
    [session.isAuthenticated, session.browserOnline, session.backendConnected, session.isConfigured]
  );
}

export function usePuzzleBank() {
  const session = useRuntimeSession();
  return useRuntimeResource(
    () => (session.isAuthenticated ? runtimeGateway.getPuzzleBank() : Promise.resolve({ puzzles: [], attempts: [] })),
    [session.isAuthenticated, session.browserOnline, session.backendConnected, session.isConfigured]
  );
}

export function usePuzzleDetails(puzzleId: string) {
  const session = useRuntimeSession();
  return useRuntimeResource(
    () => (session.isAuthenticated && puzzleId ? runtimeGateway.getPuzzleDetails(puzzleId) : Promise.resolve({ puzzle: null, attempts: [], stats: null })),
    [puzzleId, session.isAuthenticated, session.browserOnline, session.backendConnected, session.isConfigured]
  );
}

export function usePuzzlePlaybackConfig() {
  const session = useRuntimeSession();
  return useRuntimeResource(
    () => (session.isAuthenticated ? runtimeGateway.getPuzzlePlaybackConfig() : getPuzzlePlaybackConfig()),
    [session.isAuthenticated, session.browserOnline, session.backendConnected, session.isConfigured]
  );
}
