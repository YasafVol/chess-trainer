import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Chess } from "chess.js";
import type { AnalysisRun, GameRecord, PlyAnalysis } from "../domain/types";
import { getGame } from "../lib/storage/repositories/gamesRepo";
import {
  getLatestAnalysisRunByGameId,
  listPlyAnalysisByRunId,
  saveAnalysisRun,
  savePlyAnalysis
} from "../lib/storage/repositories/analysisRepo";
import { ANALYSIS_POLICY } from "../domain/analysisPolicy";
import { buildReplayData } from "../domain/gameReplay";
import { buildAnalysisPlan, lowerDepthForRetry } from "../domain/analysisPlan";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import type { BoardAdapter } from "../board/BoardAdapter";
import { EngineClient, type EngineFlavor, type EngineResultMessage } from "../engine/engineClient";

const ANALYSIS_RETRY_LIMIT = 1;

function formatEval(evaluationType: "cp" | "mate", evaluation: number): string {
  if (evaluationType === "mate") {
    return `M${evaluation > 0 ? "+" : ""}${evaluation}`;
  }
  const cp = evaluation / 100;
  return `${cp >= 0 ? "+" : ""}${cp.toFixed(2)}`;
}

function chooseEngineFlavor(): EngineFlavor {
  const isMobile =
    typeof navigator !== "undefined" &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    return "stockfish-18-lite-single";
  }

  if (typeof crossOriginIsolated !== "undefined" && crossOriginIsolated) {
    return "stockfish-18";
  }

  return "stockfish-18-single";
}

export function GamePage() {
  const { gameId } = useParams({ from: "/game/$gameId" });
  const [game, setGame] = useState<GameRecord | null>(null);
  const [analysisRun, setAnalysisRun] = useState<AnalysisRun | null>(null);
  const [analysisByPly, setAnalysisByPly] = useState<PlyAnalysis[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<string>("No analysis run yet.");
  const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number } | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [currentPly, setCurrentPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [manualFen, setManualFen] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<BoardAdapter | null>(null);
  const engineRef = useRef<EngineClient | null>(null);
  const cancelRequestedRef = useRef(false);
  const engineFlavorRef = useRef<EngineFlavor>(chooseEngineFlavor());

  const replayData = useMemo(() => {
    if (!game) return null;
    try {
      setParseError(null);
      return buildReplayData(game.pgn, game.initialFen);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse PGN.");
      return null;
    }
  }, [game]);

  const totalPlies = replayData?.moves.length ?? 0;
  const moveList = replayData?.moves ?? [];

  const analysisByPlyMap = useMemo(() => {
    const map = new Map<number, PlyAnalysis>();
    for (const ply of analysisByPly) {
      map.set(ply.ply, ply);
    }
    return map;
  }, [analysisByPly]);

  async function refreshAnalysisState(targetGameId: string): Promise<void> {
    const run = await getLatestAnalysisRunByGameId(targetGameId);
    const plies = run ? await listPlyAnalysisByRunId(run.id) : [];
    setAnalysisRun(run);
    setAnalysisByPly(plies);
    if (!run) {
      setAnalysisStatus("No analysis run yet.");
      return;
    }
    setAnalysisStatus(
      `${run.engineName} ${run.engineVersion} (${run.engineFlavor}) depth=${run.options.depth} status=${run.status}`
    );
  }

  useEffect(() => {
    const engine = new EngineClient();
    engineRef.current = engine;
    let active = true;
    engine
      .init(engineFlavorRef.current)
      .then(() => {
        if (!active) return;
        setEngineReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setAnalysisError(error instanceof Error ? error.message : "Engine init failed.");
      });

    return () => {
      active = false;
      cancelRequestedRef.current = true;
      engine.terminate();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    getGame(gameId).then(setGame).catch(() => setGame(null));
    refreshAnalysisState(gameId).catch(() => setAnalysisStatus("Failed to load analysis summary."));
  }, [gameId]);

  useEffect(() => {
    setCurrentPly(0);
    setFlipped(false);
    setIsPlaying(false);
    setManualFen(null);
    setAnalysisProgress(null);
    setAnalysisError(null);
  }, [gameId]);

  useEffect(() => {
    if (!boardHostRef.current || !replayData) return;
    const board = new ChessboardElementAdapter();
    board.mount(boardHostRef.current);
    boardRef.current = board;

    const unbindDrop = board.onDrop(({ from, to, setAction }) => {
      const baseFen = manualFen ?? replayData.fenPositions[currentPly];
      if (!baseFen) {
        setAction("snapback");
        return;
      }

      try {
        const chess = new Chess(baseFen);
        const candidateMoves = (chess.moves({ square: from as any, verbose: true } as any) as unknown as Array<{
          from: string;
          to: string;
          promotion?: string;
        }>).filter((move) => move.to === to);

        if (candidateMoves.length === 0) {
          setAction("snapback");
          return;
        }

        const chosenMove =
          candidateMoves.find((move) => move.promotion === "q") ?? candidateMoves[0];

        const result = chess.move({
          from: chosenMove.from,
          to: chosenMove.to,
          promotion: chosenMove.promotion
        });

        if (!result) {
          setAction("snapback");
          return;
        }

        setAction("drop");
        setIsPlaying(false);
        setManualFen(chess.fen());
      } catch {
        setAction("snapback");
      }
    });

    return () => {
      unbindDrop();
      board.destroy();
      boardRef.current = null;
    };
  }, [replayData, gameId, currentPly, manualFen]);

  useEffect(() => {
    if (!replayData || !boardRef.current) return;
    const safePly = Math.max(0, Math.min(currentPly, totalPlies));
    const fen = manualFen ?? replayData.fenPositions[safePly];
    if (!fen) return;
    boardRef.current.setOrientation(flipped ? "black" : "white");
    boardRef.current.setPosition(fen, true);
  }, [currentPly, flipped, replayData, totalPlies, manualFen]);

  useEffect(() => {
    if (!isPlaying || !replayData) return;
    const timer = window.setInterval(() => {
      setCurrentPly((ply) => {
        if (ply >= totalPlies) {
          setIsPlaying(false);
          return ply;
        }
        return ply + 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [isPlaying, replayData, totalPlies]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && analysisRunning) {
        cancelRequestedRef.current = true;
        void engineRef.current?.cancel().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [analysisRunning]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTypingTarget) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIsPlaying(false);
        setManualFen(null);
        setCurrentPly((ply) => Math.max(0, ply - 1));
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIsPlaying(false);
        setManualFen(null);
        setCurrentPly((ply) => Math.min(totalPlies, ply + 1));
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        setIsPlaying(false);
        setManualFen(null);
        setCurrentPly(0);
        return;
      }

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        setManualFen(null);
        setIsPlaying((playing) => !playing);
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [totalPlies]);

  async function runAnalysis(): Promise<void> {
    if (!game || !replayData || !engineRef.current || analysisRunning) {
      return;
    }

    cancelRequestedRef.current = false;
    setAnalysisRunning(true);
    setAnalysisError(null);

    const plan = buildAnalysisPlan(totalPlies, moveList.map((move) => move.san), ANALYSIS_POLICY.defaultDepth);
    setAnalysisProgress({ done: 0, total: plan.length });

    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const runStartTs = Date.now();

    const run: AnalysisRun = {
      id: runId,
      gameId: game.id,
      schemaVersion: 1,
      engineName: "Stockfish",
      engineVersion: "18",
      engineFlavor: engineFlavorRef.current,
      options: {
        depth: ANALYSIS_POLICY.defaultDepth,
        multiPV: ANALYSIS_POLICY.defaultMultiPV,
        movetimeMs: ANALYSIS_POLICY.softPerPositionMaxMs
      },
      status: "running",
      createdAt: startedAt
    };

    await saveAnalysisRun(run);
    setAnalysisRun(run);
    setAnalysisStatus(
      `${run.engineName} ${run.engineVersion} (${run.engineFlavor}) depth=${run.options.depth} status=${run.status}`
    );

    let done = 0;
    let stoppedByBudget = false;
    let retriesUsed = 0;

    try {
      for (const step of plan) {
        if (cancelRequestedRef.current) {
          break;
        }

        const fen = replayData.fenPositions[step.ply];
        if (!fen) {
          continue;
        }

        const startedStepAt = Date.now();
        let result: Awaited<ReturnType<EngineClient["analyzePosition"]>> | null = null;
        let depthForAttempt = step.depth;
        let attempt = 0;

        while (attempt <= ANALYSIS_RETRY_LIMIT) {
          try {
            result = await engineRef.current.analyzePosition({
              fen,
              movesUci: game.movesUci.slice(0, step.ply),
              depth: depthForAttempt,
              multiPV: ANALYSIS_POLICY.defaultMultiPV,
              movetimeMs: ANALYSIS_POLICY.softPerPositionMaxMs
            });
            break;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown engine error";
            const canRetry =
              attempt < ANALYSIS_RETRY_LIMIT &&
              (message.toLowerCase().includes("timed out") ||
                message.toLowerCase().includes("engine worker error") ||
                message.toLowerCase().includes("another analysis is already running"));

            if (!canRetry) {
              throw error;
            }

            retriesUsed += 1;
            attempt += 1;
            depthForAttempt = lowerDepthForRetry(depthForAttempt);
            setAnalysisStatus(
              `Retrying ply ${step.ply} after engine timeout/error (depth ${depthForAttempt})...`
            );
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
        }

        if (!result) {
          throw new Error("Engine returned no result");
        }

        if (result.type === "engine:cancelled") {
          cancelRequestedRef.current = true;
          break;
        }

        const analysisResult = result as EngineResultMessage;
        const plyRecord: PlyAnalysis = {
          id: crypto.randomUUID(),
          runId,
          gameId: game.id,
          ply: step.ply,
          fen,
          playedMoveUci: game.movesUci[step.ply],
          bestMoveUci: analysisResult.payload.bestMoveUci,
          evaluationType: analysisResult.payload.evaluationType,
          evaluation: analysisResult.payload.evaluation,
          depth: analysisResult.payload.depth,
          nodes: analysisResult.payload.nodes,
          nps: analysisResult.payload.nps,
          timeMs: Date.now() - startedStepAt,
          pvUci: analysisResult.payload.pvUci
        };
        await savePlyAnalysis(plyRecord);

        setAnalysisByPly((prev) => {
          const map = new Map<number, PlyAnalysis>();
          for (const item of prev) map.set(item.ply, item);
          map.set(plyRecord.ply, plyRecord);
          return Array.from(map.values()).sort((a, b) => a.ply - b.ply);
        });

        done += 1;
        setAnalysisProgress({ done, total: plan.length });

        if (Date.now() - runStartTs > ANALYSIS_POLICY.foregroundBudgetMs) {
          cancelRequestedRef.current = true;
          stoppedByBudget = true;
          break;
        }
      }

      const finishedStatus: AnalysisRun = {
        ...run,
        status: cancelRequestedRef.current ? "cancelled" : "completed",
        completedAt: new Date().toISOString(),
        error: stoppedByBudget
          ? "Stopped after foreground runtime budget; rerun to continue refining."
          : retriesUsed > 0
          ? `Completed with ${retriesUsed} retry${retriesUsed === 1 ? "" : "ies"}.`
          : undefined
      };
      await saveAnalysisRun(finishedStatus);
      setAnalysisRun(finishedStatus);
      setAnalysisStatus(
        `${finishedStatus.engineName} ${finishedStatus.engineVersion} (${finishedStatus.engineFlavor}) depth=${finishedStatus.options.depth} status=${finishedStatus.status}`
      );
      if (stoppedByBudget) {
        setAnalysisError("Stopped after runtime budget. Run analysis again to continue.");
      } else if (retriesUsed > 0) {
        setAnalysisError(`Analysis completed with ${retriesUsed} retry${retriesUsed === 1 ? "" : "ies"}.`);
      }
    } catch (error) {
      const failed: AnalysisRun = {
        ...run,
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown analysis error"
      };
      await saveAnalysisRun(failed);
      setAnalysisRun(failed);
      setAnalysisStatus(
        `${failed.engineName} ${failed.engineVersion} (${failed.engineFlavor}) depth=${failed.options.depth} status=${failed.status}`
      );
      setAnalysisError(failed.error ?? "Analysis failed.");
    } finally {
      setAnalysisRunning(false);
      setAnalysisProgress(null);
      await refreshAnalysisState(game.id).catch(() => undefined);
    }
  }

  async function cancelAnalysis(): Promise<void> {
    cancelRequestedRef.current = true;
    setAnalysisRunning(false);
    setAnalysisProgress(null);
    setAnalysisError("Analysis cancelled.");
    try {
      await engineRef.current?.cancel();
    } catch {
      // no-op
    }
  }

  return (
    <section className="page">
      <h2>Game {gameId}</h2>
      {!game ? <p>Game not found.</p> : null}
      {game ? (
        <>
          <p>
            <strong>{game.headers.White ?? "White"}</strong> vs <strong>{game.headers.Black ?? "Black"}</strong>
          </p>
          <p>Hash: {game.hash}</p>
          {parseError ? <p>{parseError}</p> : null}
          {replayData ? (
            <div className="game-layout">
              <div>
                <div ref={boardHostRef} className="board-host" />
                <div className="controls">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setManualFen(null);
                      setCurrentPly((ply) => Math.max(0, ply - 1));
                    }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setManualFen(null);
                      setCurrentPly((ply) => Math.min(totalPlies, ply + 1));
                    }}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setManualFen(null);
                      setCurrentPly(0);
                    }}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      setManualFen(null);
                      setIsPlaying((playing) => !playing);
                    }}
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button onClick={() => setFlipped((v) => !v)}>Flip</button>
                  {!analysisRunning ? (
                    <button onClick={() => void runAnalysis()} disabled={!engineReady || !replayData}>
                      Analyze game
                    </button>
                  ) : (
                    <button onClick={() => void cancelAnalysis()}>Cancel analysis</button>
                  )}
                  {manualFen ? (
                    <button onClick={() => setManualFen(null)}>Back to line</button>
                  ) : null}
                  <span className="muted">
                    Ply {currentPly}/{totalPlies}
                  </span>
                </div>
                <div className="analysis-inline">
                  {analysisProgress ? (
                    <p className="muted">
                      Analysis progress: {analysisProgress.done}/{analysisProgress.total}
                    </p>
                  ) : null}
                  {analysisError ? <p>{analysisError}</p> : null}
                  <p className="muted">Engine: {engineReady ? "ready" : "initializing..."}</p>
                  {analysisByPlyMap.get(currentPly) ? (
                    <>
                      <p>
                        Current eval:{" "}
                        <strong>
                          {formatEval(
                            analysisByPlyMap.get(currentPly)!.evaluationType,
                            analysisByPlyMap.get(currentPly)!.evaluation
                          )}
                        </strong>
                      </p>
                      <p className="muted">
                        Best move: {analysisByPlyMap.get(currentPly)!.bestMoveUci ?? "n/a"} | Depth{" "}
                        {analysisByPlyMap.get(currentPly)!.depth}
                        {analysisByPlyMap.get(currentPly)!.timeMs
                          ? ` | ${analysisByPlyMap.get(currentPly)!.timeMs}ms`
                          : ""}
                      </p>
                      {analysisByPlyMap.get(currentPly)!.pvUci.length > 0 ? (
                        <p className="muted">PV: {analysisByPlyMap.get(currentPly)!.pvUci.join(" ")}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="muted">No eval at current ply.</p>
                  )}
                </div>
              </div>
              <div className="moves-pane" role="region" aria-label="Moves list">
                <ul className="list">
                  {moveList.map((move, index) => (
                    <li key={`${index}-${move.san}`}>
                      <button
                        className={`move-btn ${!manualFen && index + 1 === currentPly ? "active" : ""}`}
                        onClick={() => {
                          setIsPlaying(false);
                          setManualFen(null);
                          setCurrentPly(index + 1);
                        }}
                      >
                        {Math.floor(index / 2) + 1}
                        {index % 2 === 0 ? "." : "..."} {move.san}
                        {analysisByPlyMap.get(index + 1)
                          ? ` (${formatEval(
                              analysisByPlyMap.get(index + 1)!.evaluationType,
                              analysisByPlyMap.get(index + 1)!.evaluation
                            )})`
                          : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      <h3>Analysis policy</h3>
      <ul>
        <li>Default depth: {ANALYSIS_POLICY.defaultDepth}</li>
        <li>Long game threshold: {ANALYSIS_POLICY.longGameMinPlies} plies</li>
        <li>Very long threshold: {ANALYSIS_POLICY.veryLongGameMinPlies} plies</li>
      </ul>
      <h3>Latest analysis</h3>
      <p>{analysisStatus}</p>
      {analysisRun?.error ? <p>{analysisRun.error}</p> : null}
    </section>
  );
}
