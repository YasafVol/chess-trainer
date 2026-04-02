import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Chess } from "chess.js";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import type { BoardAdapter } from "../board/BoardAdapter";
import { startBoardResizeSync } from "../board/boardResize";
import { buildReplayData } from "../domain/gameReplay";
import { qualityFromAttempt } from "../domain/puzzles";
import { PUZZLE_PLAYBACK_CONFIG_DEFAULTS } from "../domain/puzzlePlaybackConfig";
import type { GameRecord, Puzzle, PuzzleAttempt, PuzzleStats } from "../domain/types";
import { runtimeGateway, usePuzzlePlaybackConfig } from "../lib/runtimeGateway";
import { PuzzleActionControls } from "./PuzzleActionControls";
import {
  buildPuzzlePlaybackFens,
  buildRevealPlaybackMoves,
  buildSolveContinuationMoves,
  describePuzzleHint,
  formatIndexedMove,
  resolveOriginalBlunderLabel
} from "./puzzleView";

const DEFAULT_STATUS = "Play the best move for the side to move.";

function sideLabel(sideToMove: "w" | "b"): string {
  return sideToMove === "w" ? "White to move" : "Black to move";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export type PuzzleTrainerResolution = {
  puzzleId: string;
  outcome: "success" | "retry";
};

type PuzzleTrainerProps = {
  puzzle: Puzzle;
  game: GameRecord | null;
  attempts: PuzzleAttempt[];
  stats: PuzzleStats | null;
  summary?: ReactNode;
  onAttemptResolved?: (resolution: PuzzleTrainerResolution) => void | Promise<void>;
};

export function PuzzleTrainer({
  puzzle,
  game,
  attempts,
  stats,
  summary,
  onAttemptResolved
}: PuzzleTrainerProps) {
  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<BoardAdapter | null>(null);
  const puzzleRef = useRef(puzzle);
  const onAttemptResolvedRef = useRef(onAttemptResolved);
  const solvedRef = useRef(false);
  const hintsUsedRef = useRef(0);
  const hadWrongAttemptRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());
  const playbackActiveRef = useRef(false);
  const playbackStepMsRef = useRef(PUZZLE_PLAYBACK_CONFIG_DEFAULTS.stepMs);
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
  const puzzlePlaybackConfig = usePuzzlePlaybackConfig();

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
    if (!replayData || puzzle.source.ply <= 0) {
      return null;
    }

    return replayData.moves[puzzle.source.ply - 1] ?? null;
  }, [puzzle.source.ply, replayData]);

  const firstSolutionMove = useMemo(() => puzzle.solutionMoves[0] ?? puzzle.expectedBestMove, [puzzle]);

  const originalBlunderLabel = useMemo(() => resolveOriginalBlunderLabel(puzzle, replayData), [puzzle, replayData]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      playbackTokenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (puzzlePlaybackConfig) {
      setPlaybackStepMs(puzzlePlaybackConfig.stepMs);
    }
  }, [puzzlePlaybackConfig]);

  useEffect(() => {
    puzzleRef.current = puzzle;
  }, [puzzle]);

  useEffect(() => {
    onAttemptResolvedRef.current = onAttemptResolved;
  }, [onAttemptResolved]);

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
    playbackStepMsRef.current = playbackStepMs;
  }, [playbackStepMs]);

  useEffect(() => {
    wrongMoveLockedRef.current = wrongMoveLocked;
  }, [wrongMoveLocked]);

  function syncBoardToFen(fen: string, animated: boolean) {
    displayedFenRef.current = fen;
    boardRef.current?.setPosition(fen, animated);
  }

  function resetBoardPosition(nextStatus?: string) {
    playbackTokenRef.current += 1;
    playbackActiveRef.current = false;
    wrongMoveLockedRef.current = false;
    boardRef.current?.setHighlightedSquares([], "default");
    syncBoardToFen(puzzleRef.current.fen, false);
    setPlaybackActive(false);
    setHintVisible(false);
    setWrongMoveLocked(false);
    setWrongMoveSquares([]);
    setStatus(nextStatus ?? "Board reset to the puzzle start.");
  }

  function restartPuzzleAttempt() {
    const nextStartedAt = Date.now();

    playbackTokenRef.current += 1;
    playbackActiveRef.current = false;
    solvedRef.current = false;
    hadWrongAttemptRef.current = false;
    hintsUsedRef.current = 0;
    startedAtRef.current = nextStartedAt;
    wrongMoveLockedRef.current = false;
    boardRef.current?.setHighlightedSquares([], "default");
    syncBoardToFen(puzzleRef.current.fen, false);
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
        await wait(playbackStepMsRef.current);
      }
    } catch (error) {
      console.error("[puzzle] playback failed", {
        puzzleId: puzzleRef.current.id,
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

  async function notifyAttemptResolved(resolution: PuzzleTrainerResolution) {
    if (onAttemptResolvedRef.current) {
      await onAttemptResolvedRef.current(resolution);
    }
  }

  useEffect(() => {
    if (!boardHostRef.current) {
      return;
    }

    const board = new ChessboardElementAdapter();
    board.mount(boardHostRef.current);
    boardRef.current = board;
    const stopBoardResizeSync = startBoardResizeSync(boardHostRef.current, board);

    const unbindDrop = board.onDrop(async ({ from, to, setAction }) => {
      const activePuzzle = puzzleRef.current;

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
        setAction("snapback");
        if (displayedFenRef.current) {
          syncBoardToFen(displayedFenRef.current, false);
        }
        setStatus(`Illegal move. ${attemptedMove} is not playable from this position.`);
        return;
      }

      if (attemptedMove !== expectedMove.slice(0, 4)) {
        setAction("drop");
        hadWrongAttemptRef.current = true;
        setHadWrongAttempt(true);
        setHintVisible(false);
        wrongMoveLockedRef.current = true;
        setWrongMoveLocked(true);
        setWrongMoveSquares([from, to]);
        displayedFenRef.current = chess.fen();
        setStatus("That move is legal, but it misses the tactic. The line is held on the board in red. Reset or Try again.");
        return;
      }

      try {
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

        await runtimeGateway.recordPuzzleAttempt({
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
          await wait(playbackStepMsRef.current);
          await playSolutionSequence(chess.fen(), continuationMoves);
        }

        await notifyAttemptResolved({
          puzzleId: activePuzzle.id,
          outcome: "success"
        });
      } catch (error) {
        console.error("[puzzle] move application failed", { puzzleId: activePuzzle.id, error });
        setAction("snapback");
      }
    });

    return () => {
      playbackTokenRef.current += 1;
      stopBoardResizeSync();
      unbindDrop();
      board.destroy();
      boardRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!boardRef.current) {
      return;
    }

    boardRef.current.setOrientation(puzzle.sideToMove === "b" ? "black" : "white");
    syncBoardToFen(puzzle.fen, false);
  }, [puzzle]);

  useEffect(() => {
    if (!boardRef.current) {
      return;
    }

    const highlightedSquares =
      solved || revealed || playbackActive
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
  }, [firstSolutionMove, hintVisible, lastOpponentMove, playbackActive, revealed, solved, wrongMoveLocked, wrongMoveSquares]);

  useEffect(() => {
    restartPuzzleAttempt();
  }, [puzzle.id]);

  const solutionSummary = puzzle.solutionMoves.length > 0 ? puzzle.solutionMoves.join(" ") : puzzle.expectedBestMove;
  const revealedMoveSummary = puzzle.solutionMoves[0] ?? puzzle.expectedBestMove;

  async function revealSolution() {
    if (playbackActiveRef.current) {
      return;
    }

    playbackTokenRef.current += 1;
    solvedRef.current = true;
    setSolved(true);
    setRevealed(true);
    setHintVisible(false);
    wrongMoveLockedRef.current = false;
    setWrongMoveLocked(false);
    setWrongMoveSquares([]);
    boardRef.current?.setHighlightedSquares([], "default");
    syncBoardToFen(puzzle.fen, false);
    setStatus(`Revealed. Showing best move: ${revealedMoveSummary}`);

    await runtimeGateway.recordPuzzleAttempt({
      puzzleId: puzzle.id,
      result: "fail",
      quality: qualityFromAttempt({ result: "fail", hintsUsed, revealed: true, firstTry: false }),
      elapsedMs: Date.now() - startedAt,
      hintsUsed,
      revealed: true,
      attemptedAt: new Date().toISOString()
    });

    const revealMoves = buildRevealPlaybackMoves(puzzle.solutionMoves);
    if (revealMoves.length > 0) {
      await wait(120);
      await playSolutionSequence(puzzle.fen, revealMoves);
    }

    await notifyAttemptResolved({
      puzzleId: puzzle.id,
      outcome: "retry"
    });
  }

  return (
    <div className="game-layout">
      <div>
        {summary}
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
            setStatus(describePuzzleHint(puzzle.fen, firstSolutionMove));
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
        <p className="muted">{sideLabel(puzzle.sideToMove)}</p>
        <p className="muted">Opponent last move: {lastOpponentMove ? formatIndexedMove(puzzle.source.ply - 1, lastOpponentMove.san) : "Starting position"}</p>
        {originalBlunderLabel ? (
          <details key={puzzle.id} className="puzzle-disclosure">
            <summary>Show original blunder</summary>
            <p className="muted">{originalBlunderLabel}</p>
          </details>
        ) : null}
        <p className="muted">Themes: {puzzle.themes.join(", ")}</p>
        <p className="muted">Playback speed: {playbackStepMs}ms per move</p>
        <details className="puzzle-disclosure">
          <summary>Show solution line</summary>
          <p className="muted">{solutionSummary}</p>
        </details>
        <p className="muted">Eval swing: {puzzle.evalSwing}</p>
        <p className="muted">Last reviewed: {puzzle.schedule.lastReviewedAt ? new Date(puzzle.schedule.lastReviewedAt).toLocaleString() : "never"}</p>
        <p className="muted">Attempts: {stats?.attempts ?? attempts.length}</p>
        <p className="muted">Success rate: {Math.round((stats?.overallSuccessRate ?? 0) * 100)}%</p>
      </div>
    </div>
  );
}
