import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Chess, type Square } from "chess.js";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import type { BoardAdapter } from "../board/BoardAdapter";
import { startBoardResizeSync } from "../board/boardResize";
import { buildReplayData } from "../domain/gameReplay";
import { qualityFromAttempt } from "../domain/puzzles";
import { PUZZLE_PLAYBACK_CONFIG_DEFAULTS } from "../domain/puzzlePlaybackConfig";
import { recordPuzzleAttemptLocal, useLocalGame, useLocalPuzzleDetails } from "../lib/mockData";
import { getPuzzlePlaybackConfig } from "../lib/storage/repositories/appMetaRepo";
import { PuzzleActionControls } from "../presentation/PuzzleActionControls";
import {
  buildPuzzlePlaybackFens,
  buildRevealPlaybackMoves,
  buildSolveContinuationMoves,
  describePuzzleHint,
  formatIndexedMove,
  resolveOriginalBlunderLabel
} from "../presentation/puzzleView";

const DEFAULT_STATUS = "Play the best move for the side to move.";

function sideLabel(sideToMove: "w" | "b"): string {
  return sideToMove === "w" ? "White to move" : "Black to move";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export function PuzzlePage() {
  const { puzzleId } = useParams({ from: "/puzzles/$puzzleId" });
  const puzzleData = useLocalPuzzleDetails(puzzleId);
  const puzzle = puzzleData?.puzzle ?? null;
  const game = useLocalGame(puzzle?.gameId ?? "");
  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<BoardAdapter | null>(null);
  const puzzleRef = useRef<typeof puzzle>(null);
  const solvedRef = useRef(false);
  const hintsUsedRef = useRef(0);
  const hadWrongAttemptRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());
  const playbackActiveRef = useRef(false);
  const playbackTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const wrongMoveLockedRef = useRef(false);
  const displayedFenRef = useRef<string | null>(null);
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [playbackActive, setPlaybackActive] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [wrongMoveLocked, setWrongMoveLocked] = useState(false);
  const [wrongMoveSquares, setWrongMoveSquares] = useState<string[]>([]);
  const [playbackStepMs, setPlaybackStepMs] = useState(PUZZLE_PLAYBACK_CONFIG_DEFAULTS.stepMs);

  const attempts = puzzleData?.attempts ?? [];
  const stats = puzzleData?.stats ?? null;

  const replayData = useMemo(() => {
    if (!game) {
      return null;
    }

    try {
      return buildReplayData(game.pgn, game.initialFen);
    } catch {
      return null;
    }
  }, [game]);

  const lastOpponentMove = useMemo(() => {
    if (!puzzle || !replayData || puzzle.source.ply <= 0) {
      return null;
    }

    return replayData.moves[puzzle.source.ply - 1] ?? null;
  }, [puzzle, replayData]);

  const firstSolutionMove = useMemo(() => {
    if (!puzzle) {
      return "";
    }

    return puzzle.solutionMoves[0] ?? puzzle.expectedBestMove;
  }, [puzzle]);

  const originalBlunderLabel = useMemo(() => {
    if (!puzzle) {
      return null;
    }

    return resolveOriginalBlunderLabel(puzzle, replayData);
  }, [puzzle, replayData]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      playbackTokenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void getPuzzlePlaybackConfig().then((config) => {
      if (active) {
        setPlaybackStepMs(config.stepMs);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    puzzleRef.current = puzzle;
  }, [puzzle]);

  useEffect(() => {
    solvedRef.current = solved;
  }, [solved]);

  useEffect(() => {
    hintsUsedRef.current = hintsUsed;
  }, [hintsUsed]);

  useEffect(() => {
    hadWrongAttemptRef.current = hadWrongAttempt;
  }, [hadWrongAttempt]);

  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  useEffect(() => {
    playbackActiveRef.current = playbackActive;
  }, [playbackActive]);

  useEffect(() => {
    wrongMoveLockedRef.current = wrongMoveLocked;
  }, [wrongMoveLocked]);

  function syncBoardToFen(fen: string, animated: boolean) {
    displayedFenRef.current = fen;
    boardRef.current?.setPosition(fen, animated);
  }

  function resetBoardPosition(nextStatus?: string) {
    const activePuzzle = puzzleRef.current;
    if (!activePuzzle) {
      return;
    }

    playbackTokenRef.current += 1;
    playbackActiveRef.current = false;
    wrongMoveLockedRef.current = false;
    boardRef.current?.setHighlightedSquares([], "default");
    syncBoardToFen(activePuzzle.fen, false);
    setPlaybackActive(false);
    setHintVisible(false);
    setWrongMoveLocked(false);
    setWrongMoveSquares([]);
    setStatus(nextStatus ?? "Board reset to the puzzle start.");
  }

  function restartPuzzleAttempt() {
    const nextStartedAt = Date.now();
    const activePuzzle = puzzleRef.current;

    playbackTokenRef.current += 1;
    playbackActiveRef.current = false;
    solvedRef.current = false;
    hadWrongAttemptRef.current = false;
    hintsUsedRef.current = 0;
    startedAtRef.current = nextStartedAt;
    wrongMoveLockedRef.current = false;
    boardRef.current?.setHighlightedSquares([], "default");
    if (activePuzzle) {
      syncBoardToFen(activePuzzle.fen, false);
    }
    setPlaybackActive(false);
    setStatus(DEFAULT_STATUS);
    setHintsUsed(0);
    setHintVisible(false);
    setWrongMoveLocked(false);
    setWrongMoveSquares([]);
    setRevealed(false);
    setSolved(false);
    setHadWrongAttempt(false);
    setStartedAt(nextStartedAt);
  }

  useEffect(() => {
    console.log("[puzzle] load", {
      puzzleId,
      hasPuzzle: !!puzzle,
      sideToMove: puzzle?.sideToMove,
      lastOpponentMove: lastOpponentMove?.san ?? null,
      classification: puzzle?.classification,
      solutionMoves: puzzle?.solutionMoves ?? []
    });
  }, [lastOpponentMove, puzzle, puzzleId]);

  async function playSolutionSequence(startFen: string, moves: string[]) {
    const board = boardRef.current;
    if (!board || moves.length === 0) {
      return;
    }

    const token = playbackTokenRef.current + 1;
    playbackTokenRef.current = token;
    playbackActiveRef.current = true;
    if (mountedRef.current) {
      setPlaybackActive(true);
    }

    try {
      const frames = buildPuzzlePlaybackFens(startFen, moves);
      for (const fen of frames) {
        if (playbackTokenRef.current !== token) {
          return;
        }
        board.setPosition(fen, true);
        await wait(playbackStepMs);
      }
    } catch (error) {
      console.error("[puzzle] playback failed", {
        puzzleId: puzzleRef.current?.id,
        moves,
        error
      });
      if (mountedRef.current) {
        setStatus("The solution line could not be fully played on the board.");
      }
    } finally {
      if (playbackTokenRef.current === token) {
        playbackActiveRef.current = false;
        if (mountedRef.current) {
          setPlaybackActive(false);
        }
      }
    }
  }

  useEffect(() => {
    if (!boardHostRef.current || !puzzle) {
      return;
    }

    console.log("[puzzle] mount board", {
      puzzleId: puzzle.id,
      sideToMove: puzzle.sideToMove
    });

    const board = new ChessboardElementAdapter();
    board.mount(boardHostRef.current);
    boardRef.current = board;
    const stopBoardResizeSync = startBoardResizeSync(boardHostRef.current, board);

    const unbindDrop = board.onDrop(async ({ from, to, setAction }) => {
      const activePuzzle = puzzleRef.current;
      if (!activePuzzle) {
        setAction("snapback");
        return;
      }

      if (solvedRef.current || playbackActiveRef.current) {
        setAction("snapback");
        if (displayedFenRef.current) {
          syncBoardToFen(displayedFenRef.current, false);
        }
        return;
      }

      if (wrongMoveLockedRef.current) {
        setAction("snapback");
        if (displayedFenRef.current) {
          syncBoardToFen(displayedFenRef.current, false);
        }
        setStatus("The suboptimal move is still on the board. Reset or Try again to continue.");
        return;
      }

      const expectedMove = activePuzzle.solutionMoves[0] ?? activePuzzle.expectedBestMove;
      const attemptedMove = `${from}${to}`;
      const attemptedPromotion = attemptedMove === expectedMove.slice(0, 4) && expectedMove.length > 4
        ? expectedMove.slice(4)
        : undefined;

      if (from === to) {
        setAction("snapback");
        if (displayedFenRef.current) {
          syncBoardToFen(displayedFenRef.current, false);
        }
        setStatus(`Illegal move. ${from} stays on the same square.`);
        return;
      }

      const chess = new Chess(activePuzzle.fen);
      const result = chess.move({
        from,
        to,
        promotion: attemptedPromotion
      });

      if (!result) {
        console.log("[puzzle] illegal attempt", {
          puzzleId: activePuzzle.id,
          attemptedMove
        });
        setAction("snapback");
        if (displayedFenRef.current) {
          syncBoardToFen(displayedFenRef.current, false);
        }
        setStatus(`Illegal move. ${attemptedMove} is not playable from this position.`);
        return;
      }

      if (attemptedMove !== expectedMove.slice(0, 4)) {
        console.log("[puzzle] wrong attempt", {
          puzzleId: activePuzzle.id,
          attemptedMove,
          expectedMove
        });
        setAction("drop");
        hadWrongAttemptRef.current = true;
        setHadWrongAttempt(true);
        setHintVisible(false);
        wrongMoveLockedRef.current = true;
        setWrongMoveLocked(true);
        setWrongMoveSquares([from, to]);
        displayedFenRef.current = chess.fen();
        setStatus(`That move is legal, but it misses the tactic. The line is held on the board in red. Reset or Try again.`);
        return;
      }

      try {
        console.log("[puzzle] solved", {
          puzzleId: activePuzzle.id,
          attemptedMove,
          solutionMoves: activePuzzle.solutionMoves
        });

        setAction("drop");
        wrongMoveLockedRef.current = false;
        board.setHighlightedSquares([], "default");
        syncBoardToFen(chess.fen(), true);
        solvedRef.current = true;
        setSolved(true);
        setHintVisible(false);
        setWrongMoveLocked(false);
        setWrongMoveSquares([]);
        setStatus(`Correct. Playing solution: ${activePuzzle.solutionMoves.join(" ")}`);

        void recordPuzzleAttemptLocal({
          puzzleId: activePuzzle.id,
          result: "success",
          quality: qualityFromAttempt({ result: "success", hintsUsed: hintsUsedRef.current, revealed: false, firstTry: !hadWrongAttemptRef.current }),
          elapsedMs: Date.now() - startedAtRef.current,
          hintsUsed: hintsUsedRef.current,
          revealed: false,
          attemptedAt: new Date().toISOString()
        });

        const continuationMoves = buildSolveContinuationMoves(activePuzzle.solutionMoves);
        if (continuationMoves.length > 0) {
          await wait(playbackStepMs);
          await playSolutionSequence(chess.fen(), continuationMoves);
        }
      } catch (error) {
        console.error("[puzzle] move application failed", { puzzleId: activePuzzle.id, error });
        setAction("snapback");
      }
    });

    return () => {
      console.log("[puzzle] destroy board", { puzzleId: puzzle.id });
      playbackTokenRef.current += 1;
      stopBoardResizeSync();
      unbindDrop();
      board.destroy();
      boardRef.current = null;
    };
  }, [puzzle?.fen, puzzle?.id, puzzle?.sideToMove]);

  useEffect(() => {
    if (!boardRef.current || !puzzle) {
      return;
    }

    console.log("[puzzle] update board position", {
      puzzleId: puzzle.id,
      sideToMove: puzzle.sideToMove,
      fen: puzzle.fen
    });
    boardRef.current.setOrientation(puzzle.sideToMove === "b" ? "black" : "white");
    syncBoardToFen(puzzle.fen, false);
  }, [puzzle]);

  useEffect(() => {
    if (!boardRef.current) {
      return;
    }

    const highlightedSquares =
      !puzzle || solved || revealed || playbackActive
        ? []
        : wrongMoveLocked && wrongMoveSquares.length > 0
          ? wrongMoveSquares
          : hintVisible && firstSolutionMove.length >= 2
          ? [firstSolutionMove.slice(0, 2)]
          : lastOpponentMove
            ? [lastOpponentMove.from, lastOpponentMove.to]
            : [];

    const tone = wrongMoveLocked && wrongMoveSquares.length > 0 ? "error" : "default";
    boardRef.current.setHighlightedSquares(highlightedSquares, tone);
  }, [firstSolutionMove, hintVisible, lastOpponentMove, playbackActive, puzzle, revealed, solved, wrongMoveLocked, wrongMoveSquares]);

  useEffect(() => {
    restartPuzzleAttempt();
  }, [puzzleId]);

  if (puzzleData === undefined) {
    return <section className="page"><p>Loading puzzle...</p></section>;
  }

  if (!puzzle) {
    return <section className="page"><p>Puzzle not found.</p></section>;
  }

  const activePuzzle = puzzle;
  const solutionSummary = activePuzzle.solutionMoves.length > 0
    ? activePuzzle.solutionMoves.join(" ")
    : activePuzzle.expectedBestMove;
  const revealedMoveSummary = activePuzzle.solutionMoves[0] ?? activePuzzle.expectedBestMove;

  async function revealSolution() {
    if (playbackActiveRef.current) {
      return;
    }

    console.log("[puzzle] reveal solution", {
      puzzleId: activePuzzle.id,
      solutionMoves: activePuzzle.solutionMoves
    });
    playbackTokenRef.current += 1;
    solvedRef.current = true;
    setSolved(true);
    setRevealed(true);
    setHintVisible(false);
    wrongMoveLockedRef.current = false;
    setWrongMoveLocked(false);
    setWrongMoveSquares([]);
    boardRef.current?.setHighlightedSquares([], "default");
    syncBoardToFen(activePuzzle.fen, false);
    setStatus(`Revealed. Showing best move: ${revealedMoveSummary}`);

    await recordPuzzleAttemptLocal({
      puzzleId: activePuzzle.id,
      result: "fail",
      quality: qualityFromAttempt({ result: "fail", hintsUsed, revealed: true, firstTry: false }),
      elapsedMs: Date.now() - startedAt,
      hintsUsed,
      revealed: true,
      attemptedAt: new Date().toISOString()
    });

    const revealMoves = buildRevealPlaybackMoves(activePuzzle.solutionMoves);
    if (revealMoves.length > 0) {
      await wait(120);
      await playSolutionSequence(activePuzzle.fen, revealMoves);
    }
  }

  return (
    <section className="page">
      <h2>{activePuzzle.classification.toUpperCase()} puzzle</h2>
      <p className="muted">Difficulty {activePuzzle.difficulty}/5</p>
      <div className="game-layout">
        <div>
          <div ref={boardHostRef} className="board-host" />
          <PuzzleActionControls
            hintDisabled={solved || revealed || playbackActive || wrongMoveLocked}
            revealDisabled={revealed || playbackActive}
            onHint={() => {
              if (!firstSolutionMove) {
                setStatus("Hint unavailable for this puzzle.");
                return;
              }
              hintsUsedRef.current += 1;
              setHintsUsed((value) => value + 1);
              setHintVisible(true);
              boardRef.current?.setHighlightedSquares([firstSolutionMove.slice(0, 2)], "default");
              setStatus(describePuzzleHint(activePuzzle.fen, firstSolutionMove));
            }}
            onReveal={() => {
              void revealSolution();
            }}
            onReset={() => {
              resetBoardPosition(
                solved || revealed
                  ? "Board reset to the puzzle start. Use Try again for a fresh attempt."
                  : "Board reset to the puzzle start."
              );
            }}
            onTryAgain={() => {
              restartPuzzleAttempt();
            }}
          />
          <p>{status}</p>
        </div>
        <div className="moves-pane">
          <h3>Puzzle details</h3>
          <p className="muted">{sideLabel(activePuzzle.sideToMove)}</p>
          <p className="muted">Opponent last move: {lastOpponentMove ? formatIndexedMove(activePuzzle.source.ply - 1, lastOpponentMove.san) : "Starting position"}</p>
          {originalBlunderLabel ? (
            <details key={activePuzzle.id} className="puzzle-disclosure">
              <summary>Show original blunder</summary>
              <p className="muted">{originalBlunderLabel}</p>
            </details>
          ) : null}
          <p className="muted">Themes: {activePuzzle.themes.join(", ")}</p>
          <p className="muted">Playback speed: {playbackStepMs}ms per move</p>
          <details className="puzzle-disclosure">
            <summary>Show solution line</summary>
            <p className="muted">{solutionSummary}</p>
          </details>
          <p className="muted">Eval swing: {activePuzzle.evalSwing}</p>
          <p className="muted">Last reviewed: {activePuzzle.schedule.lastReviewedAt ? new Date(activePuzzle.schedule.lastReviewedAt).toLocaleString() : "never"}</p>
          <p className="muted">Attempts: {stats?.attempts ?? attempts.length}</p>
          <p className="muted">Success rate: {Math.round((stats?.overallSuccessRate ?? 0) * 100)}%</p>
        </div>
      </div>
    </section>
  );
}
