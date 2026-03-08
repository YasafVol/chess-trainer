import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import { InlineLoader } from "../components/InlineLoader";
import { useDelayedBusy } from "../components/useDelayedBusy";
import type { BoardAdapter } from "../board/BoardAdapter";
import { runGameAnalysis } from "../application/runGameAnalysis";
import { buildReplayData } from "../domain/gameReplay";
import { EngineClient, type EngineFlavor } from "../engine/engineClient";
import { generatePuzzlesForRunLocal, savePlyLocal, saveRunLocal, useLocalAnalysisSnapshot, useLocalGame } from "../lib/mockData";
import { buildGameMetaChips, buildReplayPositionItems, resolveBoardPresentation } from "../presentation/gameView";

function chooseEngineFlavor(): EngineFlavor {
  // TODO: revisit flavor selection once the deployed app has reliable COOP/COEP and engine asset caching.
  return "stockfish-18-lite-single";
}

function formatEval(type: "cp" | "mate", evaluation: number): string {
  if (type === "mate") return `M${evaluation > 0 ? "+" : ""}${evaluation}`;
  const cp = evaluation / 100;
  return `${cp >= 0 ? "+" : ""}${cp.toFixed(2)}`;
}

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
    return "Unknown error";
  }
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
  const [boardError, setBoardError] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [boardMountVersion, setBoardMountVersion] = useState(0);
  const showAnalysisLoader = useDelayedBusy(analysisRunning, { delayMs: 250, minVisibleMs: 450 });

  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<BoardAdapter | null>(null);
  const engineRef = useRef<EngineClient | null>(null);
  const cancelRequestedRef = useRef(false);
  const engineFlavorRef = useRef<EngineFlavor>(chooseEngineFlavor());
  const currentPlyRef = useRef(0);
  const manualFenRef = useRef<string | null>(null);
  const replayDataRef = useRef<ReturnType<typeof buildReplayData> | null>(null);

  const analysisRun = snapshot?.run ?? null;
  const analysisByPly = snapshot?.plies ?? [];

  const replayState = useMemo(() => {
    if (!game) {
      return {
        replayData: null,
        parseError: null as string | null
      };
    }

    try {
      const replayData = buildReplayData(game.pgn, game.initialFen);
      return {
        replayData,
        parseError: null as string | null
      };
    } catch (error) {
      return {
        replayData: null,
        parseError: error instanceof Error ? error.message : "Failed to parse PGN."
      };
    }
  }, [game]);

  const replayData = replayState.replayData;
  const parseError = replayState.parseError;
  const totalPlies = replayData?.moves.length ?? 0;
  const gameMetaChips = useMemo(() => (game ? buildGameMetaChips(game, totalPlies) : []), [game, totalPlies]);
  const replayPositionItems = useMemo(
    () => (replayData ? buildReplayPositionItems(replayData, currentPly, manualFen) : []),
    [currentPly, manualFen, replayData]
  );
  const boardPresentation = useMemo(
    () => resolveBoardPresentation(replayData, currentPly, manualFen),
    [currentPly, manualFen, replayData]
  );

  const analysisByPlyMap = useMemo(() => {
    const map = new Map<number, (typeof analysisByPly)[number]>();
    for (const ply of analysisByPly) {
      map.set(ply.ply, ply);
    }
    return map;
  }, [analysisByPly]);

  useEffect(() => {
    currentPlyRef.current = currentPly;
  }, [currentPly]);

  useEffect(() => {
    manualFenRef.current = manualFen;
  }, [manualFen]);

  useEffect(() => {
    replayDataRef.current = replayData;
  }, [replayData]);

  useEffect(() => {
    console.log("[game] replay state updated", {
      gameId,
      hasReplayData: !!replayData,
      parseError,
      totalPlies
    });
  }, [gameId, parseError, replayData, totalPlies]);

  useEffect(() => {
    const engine = new EngineClient();
    engineRef.current = engine;
    let active = true;

    setEngineReady(false);
    console.log("[game] initializing engine", {
      gameId,
      engineFlavor: engineFlavorRef.current
    });

    engine
      .init(engineFlavorRef.current)
      .then(() => {
        if (active) {
          console.log("[game] engine ready", { gameId, engineFlavor: engineFlavorRef.current });
          setEngineReady(true);
        }
      })
      .catch((error) => {
        if (active) {
          const message = formatUnknownError(error);
          console.error("[game] engine init failed", {
            gameId,
            engineFlavor: engineFlavorRef.current,
            message,
            error
          });
          setAnalysisError(`Engine initialization failed: ${message}`);
        }
      });

    return () => {
      active = false;
      cancelRequestedRef.current = true;
      console.log("[game] terminating engine", { gameId });
      engine.terminate();
      engineRef.current = null;
    };
  }, [gameId]);

  useEffect(() => {
    const initialPly = 0;
    console.log("[game] reset view state", { gameId, initialPly });
    setCurrentPly(initialPly);
    setFlipped(false);
    setIsPlaying(false);
    setManualFen(null);
    setAnalysisProgress(null);
    setAnalysisError(null);
    setBoardError(null);
  }, [gameId, replayData]);

  useEffect(() => {
    if (!analysisRun) {
      setAnalysisStatus("No analysis run yet.");
      return;
    }
    setAnalysisStatus(`${analysisRun.engineName} ${analysisRun.engineVersion} depth=${analysisRun.options.depth} status=${analysisRun.status}`);
  }, [analysisRun]);

  useEffect(() => {
    if (!boardHostRef.current || !replayData) return;

    const host = boardHostRef.current;
    let active = true;
    let unbindDrop: (() => void) | null = null;
    let localBoard: BoardAdapter | null = null;

    setBoardError(null);

    void (async () => {
      try {
        if (typeof customElements !== "undefined") {
          console.log("[game] waiting for chess-board definition", {
            gameId,
            alreadyDefined: !!customElements.get("chess-board")
          });
          await customElements.whenDefined("chess-board");
        }

        if (!active) {
          return;
        }

        console.log("[game] mount board", {
          gameId,
          currentPly: currentPlyRef.current,
          hasManualFen: !!manualFenRef.current,
          customElementDefined: typeof customElements !== "undefined" ? !!customElements.get("chess-board") : false
        });

        const board = new ChessboardElementAdapter();
        board.mount(host);
        boardRef.current = board;
        localBoard = board;
        board.setOrientation(flipped ? "black" : "white");

        const initialBoardPresentation = resolveBoardPresentation(replayData, currentPlyRef.current, manualFenRef.current);
        if (initialBoardPresentation) {
          board.setPosition(initialBoardPresentation.targetFen, false);
          board.setHighlightedSquares(initialBoardPresentation.highlightedSquares);
        }

        setBoardMountVersion((version) => version + 1);

        unbindDrop = board.onDrop(({ from, to, setAction }) => {
          const activeReplayData = replayDataRef.current;
          const baseFen = manualFenRef.current ?? activeReplayData?.fenPositions[currentPlyRef.current];
          if (!activeReplayData || !baseFen) {
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

            console.log("[game] manual board move", {
              gameId,
              currentPly: currentPlyRef.current,
              from: chosenMove.from,
              to: chosenMove.to,
              promotion: chosenMove.promotion
            });

            setAction("drop");
            setIsPlaying(false);
            setManualFen(chess.fen());
          } catch (error) {
            console.error("[game] manual board move failed", { gameId, error });
            setAction("snapback");
          }
        });
      } catch (error) {
        const message = formatUnknownError(error);
        console.error("[game] board mount failed", {
          gameId,
          message,
          error,
          customElementDefined: typeof customElements !== "undefined" ? !!customElements.get("chess-board") : false
        });
        setBoardError(`Board failed to render: ${message}`);
      }
    })();

    return () => {
      active = false;
      console.log("[game] destroy board", { gameId });
      unbindDrop?.();
      localBoard?.destroy();
      if (boardRef.current === localBoard) {
        boardRef.current = null;
      }
    };
  }, [gameId, replayData]);

  useEffect(() => {
    if (!boardRef.current || !boardPresentation) return;

    console.log("[game] update board position", {
      gameId,
      currentPly,
      flipped,
      hasManualFen: !!manualFen,
      targetFen: boardPresentation.targetFen,
      highlightedSquares: boardPresentation.highlightedSquares
    });
    boardRef.current.setOrientation(flipped ? "black" : "white");
    boardRef.current.setPosition(boardPresentation.targetFen, false);
    boardRef.current.setHighlightedSquares(boardPresentation.highlightedSquares);
  }, [boardMountVersion, boardPresentation, currentPly, flipped, gameId, manualFen]);

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

    console.log("[game] analysis start", {
      gameId: game.id,
      totalPlies,
      engineFlavor: engineFlavorRef.current
    });

    try {
      const result = await runGameAnalysis({
        game,
        fenPositions: replayData.fenPositions,
        moveSanList: replayData.moves.map((move) => move.san),
        engineFlavor: engineFlavorRef.current,
        analyzePosition: (input) => engineRef.current!.analyzePosition(input),
        saveRun: async (run) => {
          console.log("[game] save analysis run", {
            gameId: run.gameId,
            runId: run.id,
            status: run.status,
            depth: run.options.depth
          });
          await saveRunLocal(run);
        },
        savePly: async (ply) => {
          console.log("[game] save ply analysis", {
            gameId: ply.gameId,
            runId: ply.runId,
            ply: ply.ply,
            evaluation: ply.evaluation,
            bestMoveUci: ply.bestMoveUci
          });
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

      console.log("[game] analysis finished", {
        gameId: game.id,
        runId: result.finalRun.id,
        status: result.finalRun.status,
        savedPositions: result.done
      });

      if (result.finalRun.status === "completed") {
        setAnalysisStatus(`Analysis completed. ${result.done} positions saved.`);
        const createdPuzzles = await generatePuzzlesForRunLocal(result.finalRun.id, game.id);
        console.log("[game] generated puzzles after analysis", {
          gameId: game.id,
          runId: result.finalRun.id,
          createdPuzzles
        });
      }
    } catch (error) {
      const message = formatUnknownError(error);
      console.error("[game] analysis failed", { gameId: game.id, message, error });
      setAnalysisError(message);
    } finally {
      setAnalysisRunning(false);
      setAnalysisProgress(null);
    }
  }

  async function cancelAnalysis() {
    cancelRequestedRef.current = true;
    console.log("[game] cancel analysis requested", { gameId });
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
    return <section className="page"><p>Loading game...</p></section>;
  }

  if (!game) {
    return <section className="page"><p>Game not found.</p></section>;
  }

  return (
    <section className="page">
      <h2>{game.headers.White ?? "White"} vs {game.headers.Black ?? "Black"}</h2>
      <div className="chip-row" aria-label="Game details">
        {gameMetaChips.map((chip) => (
          <span key={chip.id} className="chip">
            {chip.text}
          </span>
        ))}
      </div>
      {parseError ? <p>{parseError}</p> : null}

      {replayData ? (
        <div className="game-layout">
          <div>
            <div ref={boardHostRef} className="board-host" />
            {boardError ? <p>{boardError}</p> : null}
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
              <span className="muted">Position {currentPly}/{totalPlies}</span>
            </div>

            <div className="analysis-inline">
              {showAnalysisLoader ? (
                <InlineLoader inline label="Analyzing game" detail="Running Stockfish and saving per-position evaluations." />
              ) : null}
              {analysisProgress ? <p className="muted">Analysis progress: {analysisProgress.done}/{analysisProgress.total}</p> : null}
              {analysisError ? <p>{analysisError}</p> : null}
              <p className="muted">Engine: {engineReady ? "ready" : `initializing (${engineFlavorRef.current})...`}</p>
              {analysisByPlyMap.get(currentPly) ? (
                <>
                  <p>Current eval: <strong>{formatEval(analysisByPlyMap.get(currentPly)!.evaluationType, analysisByPlyMap.get(currentPly)!.evaluation)}</strong></p>
                  <p className="muted">Best move: {analysisByPlyMap.get(currentPly)!.bestMoveUci ?? "n/a"} - Depth {analysisByPlyMap.get(currentPly)!.depth}</p>
                  {analysisByPlyMap.get(currentPly)!.pvUci.length > 0 ? <p className="muted">PV: {analysisByPlyMap.get(currentPly)!.pvUci.join(" ")}</p> : null}
                </>
              ) : (
                <p className="muted">No eval at current ply.</p>
              )}
            </div>
          </div>

          <div className="moves-pane" role="region" aria-label="Moves list">
            <ul className="list">
              {replayPositionItems.map((item) => {
                const moveEval = analysisByPlyMap.get(item.ply);
                return (
                  <li key={item.key}>
                    <button
                      className={`move-btn ${item.isActive ? "active" : ""}`}
                      onClick={() => {
                        setIsPlaying(false);
                        setManualFen(null);
                        setCurrentPly(item.ply);
                      }}
                    >
                      {item.label}
                      {moveEval
                        ? ` (${formatEval(moveEval.evaluationType, moveEval.evaluation)})`
                        : ""}
                    </button>
                  </li>
                );
              })}
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
