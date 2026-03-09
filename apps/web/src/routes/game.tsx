import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import type { BoardAdapter } from "../board/BoardAdapter";
import { startBoardResizeSync } from "../board/boardResize";
import { runGameAnalysis } from "../application/runGameAnalysis";
import { InlineLoader } from "../components/InlineLoader";
import { useDelayedBusy } from "../components/useDelayedBusy";
import { buildReplayData } from "../domain/gameReplay";
import { EngineClient, type EngineFlavor } from "../engine/engineClient";
import { generatePuzzlesForRunLocal, savePlyLocal, saveRunLocal, useLocalAnalysisSnapshot, useLocalGame } from "../lib/mockData";
import { buildEvalBarState, buildEvalGraphState, buildMoveAnnotation, formatEval } from "../presentation/analysisView";
import { buildGameMetaChips, buildReplayPositionItems, resolveBoardPresentation } from "../presentation/gameView";

function chooseEngineFlavor(): EngineFlavor {
  // TODO: revisit flavor selection once the deployed app has reliable COOP/COEP and engine asset caching.
  return "stockfish-18-lite-single";
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

function formatBudgetLabel(budgetMs: number | undefined): string {
  if (!budgetMs) {
    return "n/a";
  }
  if (budgetMs % 1000 === 0) {
    return `${budgetMs / 1000}s`;
  }
  return `${budgetMs}ms`;
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
  const [analysisProgress, setAnalysisProgress] = useState<{
    done: number;
    total: number;
    lastCompletedPly: number | null;
    totalPlies: number;
  } | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [boardMountVersion, setBoardMountVersion] = useState(0);
  const [boardHost, setBoardHost] = useState<HTMLDivElement | null>(null);
  const showAnalysisLoader = useDelayedBusy(analysisRunning, { delayMs: 250, minVisibleMs: 450 });

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
  const currentAnalysis = analysisByPlyMap.get(currentPly);
  const evalBarState = useMemo(() => buildEvalBarState(currentAnalysis), [currentAnalysis]);
  const evalGraphState = useMemo(() => buildEvalGraphState(analysisByPly, currentPly), [analysisByPly, currentPly]);

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
    setAnalysisStatus(
      `${analysisRun.engineName} ${analysisRun.engineVersion} depth=${analysisRun.options.depth} budget=${formatBudgetLabel(analysisRun.options.foregroundBudgetMs)} status=${analysisRun.status}`
    );
  }, [analysisRun]);

  useEffect(() => {
    if (!boardHost || !replayData) return;

    const host = boardHost;
    let active = true;
    let unbindDrop: (() => void) | null = null;
    let stopBoardResizeSync: (() => void) | null = null;
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

        stopBoardResizeSync = startBoardResizeSync(host, board);
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
      stopBoardResizeSync?.();
      unbindDrop?.();
      localBoard?.destroy();
      if (boardRef.current === localBoard) {
        boardRef.current = null;
      }
    };
  }, [boardHost, gameId, replayData]);

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

  function jumpToPly(ply: number) {
    setIsPlaying(false);
    setManualFen(null);
    setCurrentPly(Math.max(0, Math.min(totalPlies, ply)));
  }

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
        onRunUpdated: (run) => {
          setAnalysisStatus(`${run.status} at depth ${run.options.depth} (budget ${formatBudgetLabel(run.options.foregroundBudgetMs)})`);
        },
        onPlySaved: (ply) => {
          setAnalysisStatus(`Analyzed ply ${ply.ply}/${totalPlies}`);
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
            <div className="board-analysis-stack">
              <div className="board-row">
                <div className="eval-bar-panel" aria-label="Evaluation bar">
                  <div className="eval-bar-label eval-bar-label-top">W</div>
                  <div className="eval-bar-track" role="img" aria-label={`Current evaluation ${evalBarState.scoreText}`}>
                    <div
                      className={`eval-bar-fill ${evalBarState.fillSide}`}
                      style={{
                        top: `${evalBarState.fillTopPercent}%`,
                        height: `${evalBarState.fillPercent}%`
                      }}
                    />
                    <div className="eval-bar-center-line" />
                    <div className="eval-bar-marker" style={{ top: `${evalBarState.markerPercent}%` }} />
                  </div>
                  <div className="eval-bar-label eval-bar-label-bottom">B</div>
                  <div className="eval-bar-value">{evalBarState.scoreText}</div>
                </div>

                <div ref={setBoardHost} className="board-host" />
              </div>

              <section className="eval-graph-panel" aria-label="Game evaluation graph">
                <div className="eval-graph-header">
                  <strong>Eval graph</strong>
                  <span className="muted">
                    {evalGraphState.selectedPoint
                      ? `Ply ${evalGraphState.selectedPoint.ply}: ${evalGraphState.selectedPoint.scoreText}`
                      : analysisByPly.length > 0
                        ? "Select a saved point to jump to that position."
                        : "Run analysis to populate the graph."}
                  </span>
                </div>

                {evalGraphState.points.length > 0 ? (
                  <svg className="eval-graph" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Clickable game evaluation graph">
                    <line className="eval-graph-baseline" x1="0" y1="50" x2="100" y2="50" />
                    {evalGraphState.selectedPoint ? (
                      <line
                        className="eval-graph-current"
                        x1={evalGraphState.selectedPoint.x}
                        y1="0"
                        x2={evalGraphState.selectedPoint.x}
                        y2="100"
                      />
                    ) : null}
                    <path className="eval-graph-path" d={evalGraphState.path} />
                    {evalGraphState.points.map((point) => (
                      <circle
                        key={point.ply}
                        className={`eval-graph-point ${point.isSelected ? "selected" : ""}`}
                        cx={point.x}
                        cy={point.y}
                        r={point.isSelected ? 2.8 : 2}
                        role="button"
                        tabIndex={0}
                        aria-label={`Jump to ply ${point.ply}, evaluation ${point.scoreText}`}
                        onClick={() => jumpToPly(point.ply)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            jumpToPly(point.ply);
                          }
                        }}
                      >
                        <title>Ply {point.ply}: {point.scoreText}</title>
                      </circle>
                    ))}
                  </svg>
                ) : (
                  <p className="muted">No saved analysis points yet.</p>
                )}
              </section>
            </div>

            {boardError ? <p>{boardError}</p> : null}
            <div className="controls">
              <button className="action-button" onClick={() => jumpToPly(currentPly - 1)}>Prev</button>
              <button className="action-button" onClick={() => jumpToPly(currentPly + 1)}>Next</button>
              <button className="action-button" onClick={() => jumpToPly(0)}>Reset</button>
              <button className="action-button" onClick={() => { setManualFen(null); setIsPlaying((playing) => !playing); }}>{isPlaying ? "Pause" : "Play"}</button>
              <button className="action-button" onClick={() => setFlipped((value) => !value)}>Flip</button>
              {!analysisRunning ? (
                <button className="action-button" onClick={() => void runAnalysis()} disabled={!engineReady}>Analyze game</button>
              ) : (
                <button className="action-button" onClick={() => void cancelAnalysis()}>Cancel analysis</button>
              )}
              {manualFen ? <button className="action-button" onClick={() => setManualFen(null)}>Back to line</button> : null}
              <span className="muted">Position {currentPly}/{totalPlies}</span>
            </div>

            <div className="analysis-inline">
              {showAnalysisLoader ? (
                <InlineLoader inline label="Analyzing game" detail="Running Stockfish and saving per-position evaluations." />
              ) : null}
              {analysisProgress ? <p className="muted">Analysis progress: ply {analysisProgress.lastCompletedPly ?? 0}/{analysisProgress.totalPlies}</p> : null}
              {analysisError ? <p>{analysisError}</p> : null}
              <p className="muted">Engine: {engineReady ? "ready" : `initializing (${engineFlavorRef.current})...`}</p>
              {currentAnalysis ? (
                <>
                  <p>Current eval: <strong>{formatEval(currentAnalysis.evaluationType, currentAnalysis.evaluation)}</strong></p>
                  <p className="muted">Best move: {currentAnalysis.bestMoveUci ?? "n/a"} - Depth {currentAnalysis.depth}</p>
                  {currentAnalysis.pvUci.length > 0 ? <p className="muted">PV: {currentAnalysis.pvUci.join(" ")}</p> : null}
                </>
              ) : (
                <p className="muted">No eval at current ply.</p>
              )}
            </div>
          </div>

          <div className="moves-pane" role="region" aria-label="Moves list">
            <ul className="list">
              {replayPositionItems.map((item) => {
                const moveEval = analysisByPlyMap.get(item.analysisPly);
                const moveAnnotation = buildMoveAnnotation(moveEval);
                return (
                  <li key={item.key}>
                    <button
                      className={`move-btn ${item.isActive ? "active" : ""}`}
                      title={moveAnnotation.label ? `${moveAnnotation.label}${moveAnnotation.lossCp ? ` (${Math.round(moveAnnotation.lossCp)}cp loss)` : ""}` : undefined}
                      onClick={() => jumpToPly(item.ply)}
                    >
                      {item.label}
                      {moveAnnotation.suffix}
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
