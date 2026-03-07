import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import type { BoardAdapter } from "../board/BoardAdapter";
import { runGameAnalysis } from "../application/runGameAnalysis";
import { buildReplayData } from "../domain/gameReplay";
import { EngineClient, type EngineFlavor } from "../engine/engineClient";
import { generatePuzzlesForRunLocal, savePlyLocal, saveRunLocal, useLocalAnalysisSnapshot, useLocalGame } from "../lib/mockData";

function chooseEngineFlavor(): EngineFlavor {
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) return "stockfish-18-lite-single";
  if (typeof crossOriginIsolated !== "undefined" && crossOriginIsolated) return "stockfish-18";
  return "stockfish-18-single";
}

function formatEval(type: "cp" | "mate", evaluation: number): string {
  if (type === "mate") return `M${evaluation > 0 ? "+" : ""}${evaluation}`;
  const cp = evaluation / 100;
  return `${cp >= 0 ? "+" : ""}${cp.toFixed(2)}`;
}

export function GamePage() {
  const { gameId } = useParams({ from: "/game/$gameId" });
  const game = useLocalGame(gameId);
  const snapshot = useLocalAnalysisSnapshot(gameId);

  const [currentPly, setCurrentPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [manualFen, setManualFen] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState("No analysis run yet.");
  const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number } | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<BoardAdapter | null>(null);
  const engineRef = useRef<EngineClient | null>(null);
  const cancelRequestedRef = useRef(false);
  const engineFlavorRef = useRef<EngineFlavor>(chooseEngineFlavor());

  const analysisRun = snapshot?.run ?? null;
  const analysisByPly = snapshot?.plies ?? [];

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
    const map = new Map<number, (typeof analysisByPly)[number]>();
    for (const ply of analysisByPly) {
      map.set(ply.ply, ply);
    }
    return map;
  }, [analysisByPly]);

  useEffect(() => {
    const engine = new EngineClient();
    engineRef.current = engine;
    let active = true;

    engine
      .init(engineFlavorRef.current)
      .then(() => {
        if (active) setEngineReady(true);
      })
      .catch((error) => {
        if (active) setAnalysisError(error instanceof Error ? error.message : "Engine init failed.");
      });

    return () => {
      active = false;
      cancelRequestedRef.current = true;
      engine.terminate();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    setCurrentPly(0);
    setFlipped(false);
    setIsPlaying(false);
    setManualFen(null);
    setAnalysisProgress(null);
    setAnalysisError(null);
  }, [gameId]);

  useEffect(() => {
    if (!analysisRun) {
      setAnalysisStatus("No analysis run yet.");
      return;
    }
    setAnalysisStatus(`${analysisRun.engineName} ${analysisRun.engineVersion} depth=${analysisRun.options.depth} status=${analysisRun.status}`);
  }, [analysisRun]);

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

        const chosenMove = candidateMoves.find((move) => move.promotion === "q") ?? candidateMoves[0];
        const result = chess.move({ from: chosenMove.from, to: chosenMove.to, promotion: chosenMove.promotion });

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
  }, [currentPly, manualFen, replayData]);

  useEffect(() => {
    if (!boardRef.current || !replayData) return;
    boardRef.current.setOrientation(flipped ? "black" : "white");
    boardRef.current.setPosition(manualFen ?? replayData.fenPositions[currentPly], true);
  }, [currentPly, flipped, manualFen, replayData]);

  useEffect(() => {
    if (!isPlaying || !replayData) return;
    if (currentPly >= totalPlies) {
      setIsPlaying(false);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setCurrentPly((ply) => Math.min(totalPlies, ply + 1));
    }, 550);
    return () => window.clearTimeout(timeoutId);
  }, [currentPly, isPlaying, replayData, totalPlies]);

  async function runAnalysis() {
    if (!game || !replayData || !engineRef.current) {
      return;
    }

    cancelRequestedRef.current = false;
    setAnalysisRunning(true);
    setAnalysisError(null);
    setAnalysisProgress(null);
    setAnalysisStatus("Starting analysis...");

    try {
      const result = await runGameAnalysis({
        game,
        fenPositions: replayData.fenPositions,
        moveSanList: replayData.moves.map((move) => move.san),
        engineFlavor: engineFlavorRef.current,
        analyzePosition: (input) => engineRef.current!.analyzePosition(input),
        saveRun: async (run) => {
          await saveRunLocal(run);
        },
        savePly: async (ply) => {
          await savePlyLocal([ply]);
        },
        isCancelRequested: () => cancelRequestedRef.current,
        markCancelRequested: () => {
          cancelRequestedRef.current = true;
        },
        onProgress: (progress) => setAnalysisProgress(progress),
        onRetryStatus: (message) => setAnalysisStatus(message),
        onRunUpdated: (run) => setAnalysisStatus(`${run.status} at depth ${run.options.depth}`),
        onPlySaved: (ply) => {
          setAnalysisStatus(`Saved ply ${ply.ply}/${totalPlies}`);
        }
      });

      if (result.finalRun.status === "completed") {
        setAnalysisStatus(`Analysis completed. ${result.done} positions saved.`);
        await generatePuzzlesForRunLocal(result.finalRun.id, game.id);
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setAnalysisRunning(false);
      setAnalysisProgress(null);
    }
  }

  async function cancelAnalysis() {
    cancelRequestedRef.current = true;
    setAnalysisRunning(false);
    setAnalysisProgress(null);
    setAnalysisError("Analysis cancelled.");
    try {
      await engineRef.current?.cancel();
    } catch {
      // ignore cancel failure
    }
  }

  if (game === undefined || snapshot === undefined) {
    return <section className="page"><p>Loading game…</p></section>;
  }

  if (!game) {
    return <section className="page"><p>Game not found.</p></section>;
  }

  return (
    <section className="page">
      <h2>{game.headers.White ?? "White"} vs {game.headers.Black ?? "Black"}</h2>
      <p className="muted">Hash: {game.hash}</p>
      {parseError ? <p>{parseError}</p> : null}

      {replayData ? (
        <div className="game-layout">
          <div>
            <div ref={boardHostRef} className="board-host" />
            <div className="controls">
              <button onClick={() => { setIsPlaying(false); setManualFen(null); setCurrentPly((ply) => Math.max(0, ply - 1)); }}>Prev</button>
              <button onClick={() => { setIsPlaying(false); setManualFen(null); setCurrentPly((ply) => Math.min(totalPlies, ply + 1)); }}>Next</button>
              <button onClick={() => { setIsPlaying(false); setManualFen(null); setCurrentPly(0); }}>Reset</button>
              <button onClick={() => { setManualFen(null); setIsPlaying((playing) => !playing); }}>{isPlaying ? "Pause" : "Play"}</button>
              <button onClick={() => setFlipped((value) => !value)}>Flip</button>
              {!analysisRunning ? (
                <button onClick={() => void runAnalysis()} disabled={!engineReady}>Analyze game</button>
              ) : (
                <button onClick={() => void cancelAnalysis()}>Cancel analysis</button>
              )}
              {manualFen ? <button onClick={() => setManualFen(null)}>Back to line</button> : null}
              <span className="muted">Ply {currentPly}/{totalPlies}</span>
            </div>

            <div className="analysis-inline">
              {analysisProgress ? <p className="muted">Analysis progress: {analysisProgress.done}/{analysisProgress.total}</p> : null}
              {analysisError ? <p>{analysisError}</p> : null}
              <p className="muted">Engine: {engineReady ? "ready" : "initializing..."}</p>
              {analysisByPlyMap.get(currentPly) ? (
                <>
                  <p>Current eval: <strong>{formatEval(analysisByPlyMap.get(currentPly)!.evaluationType, analysisByPlyMap.get(currentPly)!.evaluation)}</strong></p>
                  <p className="muted">Best move: {analysisByPlyMap.get(currentPly)!.bestMoveUci ?? "n/a"} · Depth {analysisByPlyMap.get(currentPly)!.depth}</p>
                  {analysisByPlyMap.get(currentPly)!.pvUci.length > 0 ? <p className="muted">PV: {analysisByPlyMap.get(currentPly)!.pvUci.join(" ")}</p> : null}
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
                    {Math.floor(index / 2) + 1}{index % 2 === 0 ? "." : "..."} {move.san}
                    {analysisByPlyMap.get(index)
                      ? ` (${formatEval(analysisByPlyMap.get(index)!.evaluationType, analysisByPlyMap.get(index)!.evaluation)})`
                      : ""}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <h3>Analysis status</h3>
      <p>{analysisStatus}</p>
      {analysisRun?.error ? <p>{analysisRun.error}</p> : null}
    </section>
  );
}
