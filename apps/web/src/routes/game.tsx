import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useParams } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, FlipHorizontal, Pause, Play, RotateCcw, Undo2, Zap, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import type { BoardAdapter } from "../board/BoardAdapter";
import { startBoardResizeSync } from "../board/boardResize";
import { sharedAnalysisCoordinator } from "../application/analysisCoordinator";
import { InlineLoader } from "../components/InlineLoader";
import { useDelayedBusy } from "../components/useDelayedBusy";
import { buildReplayData } from "../domain/gameReplay";
import { formatUnknownError } from "../lib/formatUnknownError";
import { useAnalysisSnapshot, useGame, useRuntimeSession } from "../lib/runtimeGateway";
import { buildEvalBarState, buildEvalGraphState, buildMoveAnnotation, formatEval } from "../presentation/analysisView";
import { buildGameMetaChips, buildReplayPositionItems, resolveBoardPresentation } from "../presentation/gameView";

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
  const session = useRuntimeSession();
  const game = useGame(gameId);
  const snapshot = useAnalysisSnapshot(gameId);
  const analysisCoordinator = useSyncExternalStore(
    (listener) => sharedAnalysisCoordinator.subscribe(listener),
    () => sharedAnalysisCoordinator.getSnapshot()
  );

  const [currentPly, setCurrentPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [manualFen, setManualFen] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardMountVersion, setBoardMountVersion] = useState(0);
  const [boardHost, setBoardHost] = useState<HTMLDivElement | null>(null);
  const activeGameIsRunning = analysisCoordinator.running && analysisCoordinator.activeGameId === gameId;
  const showAnalysisLoader = useDelayedBusy(activeGameIsRunning, { delayMs: 250, minVisibleMs: 450 });

  const boardRef = useRef<BoardAdapter | null>(null);
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
    sharedAnalysisCoordinator.ensureStarted();
  }, []);

  useEffect(() => {
    const initialPly = 0;
    console.log("[game] reset view state", { gameId, initialPly });
    setCurrentPly(initialPly);
    setFlipped(false);
    setIsPlaying(false);
    setManualFen(null);
    setBoardError(null);
  }, [gameId, replayData]);

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
    if (!game) {
      return;
    }
    await sharedAnalysisCoordinator.requestForegroundAnalysis(game.id);
  }

  async function cancelAnalysis() {
    await sharedAnalysisCoordinator.cancelActiveAnalysis();
  }

  if (game === undefined || snapshot === undefined) {
    return <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"><p className="text-muted-foreground">Loading game...</p></section>;
  }

  if (!game) {
    return <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"><p className="text-muted-foreground">Game not found.</p></section>;
  }

  const analysisProgress = activeGameIsRunning ? analysisCoordinator.progress : null;
  const analysisError = activeGameIsRunning ? analysisCoordinator.error : analysisRun?.error ?? null;
  const analysisStatus = activeGameIsRunning
    ? analysisCoordinator.status
    : analysisRun
      ? `${analysisRun.engineName} ${analysisRun.engineVersion} depth=${analysisRun.options.depth} movetime=${formatBudgetLabel(analysisRun.options.movetimeMs)} safety-limit=${formatBudgetLabel(analysisRun.options.foregroundBudgetMs)} status=${analysisRun.status}`
      : "No analysis run yet.";
  const engineStatus = analysisCoordinator.engineReady
    ? "ready"
    : analysisCoordinator.initializing
      ? "initializing..."
      : analysisCoordinator.error
        ? `error (${analysisCoordinator.error})`
        : "idle";

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{game.headers.White ?? "White"} vs {game.headers.Black ?? "Black"}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Game details">
          {gameMetaChips.map((chip) => (
            <Badge key={chip.id} variant="outline">{chip.text}</Badge>
          ))}
        </div>
      </div>
      {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}

      {replayData ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,560px)_1fr]">
          <div>
            <div className="space-y-3">
              <div className="grid grid-cols-[44px_minmax(0,1fr)] items-stretch gap-3">
                <div className="eval-bar-panel">
                  <div className="eval-bar-label eval-bar-label-top">W</div>
                  <div className="eval-bar-track" role="img" aria-label={`Current evaluation ${evalBarState.scoreText}`}>
                    <div className="eval-bar-segment eval-bar-segment-white" style={{ height: `${evalBarState.whitePercent}%` }} />
                    <div className="eval-bar-segment eval-bar-segment-black" style={{ height: `${evalBarState.blackPercent}%` }} />
                    <div className="eval-bar-center-line" />
                    <div className="eval-bar-split" style={{ top: `${evalBarState.splitPercent}%` }} />
                    <div className="eval-bar-marker" style={{ top: `${evalBarState.markerPercent}%` }} />
                  </div>
                  <div className="eval-bar-label eval-bar-label-bottom">B</div>
                  <div className="eval-bar-value">{evalBarState.scoreText}</div>
                </div>

                <div ref={setBoardHost} className="board-host" />
              </div>

              {evalGraphState.isReady ? (
                <Card className="p-3">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <strong className="text-sm">Eval graph</strong>
                    <span className="text-xs text-muted-foreground">
                      {evalGraphState.selectedPoint
                        ? `Ply ${evalGraphState.selectedPoint.ply}: ${evalGraphState.selectedPoint.scoreText}`
                        : "Select a saved point to jump to that position."}
                    </span>
                  </div>

                  <svg className="eval-graph" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Clickable game evaluation graph">
                    <line className="eval-graph-baseline" x1="0" y1="50" x2="100" y2="50" />
                    <path className="eval-graph-area" d={evalGraphState.areaPath} />
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
                    {evalGraphState.interactionTargets.map((point) => (
                      <circle
                        key={`hit-${point.ply}`}
                        className="eval-graph-hit-target"
                        cx={point.x}
                        cy={point.y}
                        r={4.2}
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
                    {evalGraphState.selectedPoint ? (
                      <circle
                        className="eval-graph-point selected"
                        cx={evalGraphState.selectedPoint.x}
                        cy={evalGraphState.selectedPoint.y}
                        r={2.8}
                      />
                    ) : null}
                  </svg>
                </Card>
              ) : null}
            </div>

            {boardError ? <p className="mt-2 text-sm text-destructive">{boardError}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => jumpToPly(currentPly - 1)}><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => jumpToPly(currentPly + 1)}><ChevronRight className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => jumpToPly(0)}><RotateCcw className="size-3.5" /></Button>
              <Button variant="outline" size="sm" onClick={() => { setManualFen(null); setIsPlaying((playing) => !playing); }}>
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFlipped((value) => !value)}><FlipHorizontal className="size-3.5" /></Button>
              {!activeGameIsRunning ? (
                <Button
                  size="sm"
                  onClick={() => void runAnalysis()}
                  disabled={!session.canMutate || !analysisCoordinator.engineReady}
                >
                  <Zap className="size-3.5" />
                  Analyze
                </Button>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => void cancelAnalysis()}>
                  <XCircle className="size-3.5" />
                  Cancel
                </Button>
              )}
              {manualFen ? <Button variant="ghost" size="sm" onClick={() => setManualFen(null)}><Undo2 className="size-3.5" />Back to line</Button> : null}
              <span className="text-xs text-muted-foreground">Position {currentPly}/{totalPlies}</span>
            </div>

            <Card className="mt-3">
              <CardContent className="p-3 space-y-1 text-sm">
                {!session.canMutate ? <p className="text-muted-foreground">Analysis writes are disabled while offline or signed out.</p> : null}
                {showAnalysisLoader ? (
                  <InlineLoader
                    inline
                    label={analysisCoordinator.mode === "background" ? "Background analysis" : "Analyzing game"}
                    detail="Running Stockfish and saving per-position evaluations."
                  />
                ) : null}
                {analysisProgress ? <p className="text-muted-foreground">Analysis progress: ply {analysisProgress.lastCompletedPly ?? 0}/{analysisProgress.totalPlies}</p> : null}
                {analysisError ? <p className="text-destructive">{analysisError}</p> : null}
                <p className="text-muted-foreground">Engine: {engineStatus}</p>
                {currentAnalysis ? (
                  <>
                    <p>Current eval: <strong>{formatEval(currentAnalysis.evaluationType, currentAnalysis.evaluation)}</strong></p>
                    <p className="text-muted-foreground">Best move: {currentAnalysis.bestMoveUci ?? "n/a"} - Depth {currentAnalysis.depth}</p>
                    {currentAnalysis.pvUci.length > 0 ? <p className="text-muted-foreground font-mono text-xs">PV: {currentAnalysis.pvUci.join(" ")}</p> : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">No eval at current ply.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="max-h-[560px] overflow-y-auto" role="region" aria-label="Moves list">
            <CardContent className="p-3">
              <ul className="space-y-0.5">
                {replayPositionItems.map((item) => {
                  const moveEval = analysisByPlyMap.get(item.analysisPly);
                  const moveAnnotation = buildMoveAnnotation(moveEval);
                  return (
                    <li key={item.key}>
                      <button
                        className={cn(
                          "w-full text-left rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors cursor-pointer hover:bg-muted",
                          item.isActive && "border-accent bg-accent/10 font-semibold text-foreground"
                        )}
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
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold">Analysis status</h3>
        <p className="text-sm text-muted-foreground">{analysisStatus}</p>
      </div>
    </section>
  );
}
