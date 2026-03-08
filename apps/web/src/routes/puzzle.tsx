import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import type { BoardAdapter } from "../board/BoardAdapter";
import { startBoardResizeSync } from "../board/boardResize";
import { buildReplayData } from "../domain/gameReplay";
import { qualityFromAttempt } from "../domain/puzzles";
import { recordPuzzleAttemptLocal, useLocalGame, useLocalPuzzleDetails } from "../lib/mockData";

function sideLabel(sideToMove: "w" | "b"): string {
  return sideToMove === "w" ? "White to move" : "Black to move";
}

function moveLabel(index: number, san: string): string {
  return `${Math.floor(index / 2) + 1}${index % 2 === 0 ? "." : "..."} ${san}`;
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
  const [status, setStatus] = useState("Play the best move for the side to move.");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());

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
    console.log("[puzzle] load", {
      puzzleId,
      hasPuzzle: !!puzzle,
      sideToMove: puzzle?.sideToMove,
      lastOpponentMove: lastOpponentMove?.san ?? null,
      classification: puzzle?.classification
    });
  }, [lastOpponentMove, puzzle, puzzleId]);

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

    const unbindDrop = board.onDrop(({ from, to, setAction }) => {
      const activePuzzle = puzzleRef.current;
      if (!activePuzzle) {
        setAction("snapback");
        return;
      }

      if (solvedRef.current) {
        setAction("snapback");
        return;
      }

      const attemptedMove = `${from}${to}`;
      if (attemptedMove !== activePuzzle.expectedBestMove.slice(0, 4)) {
        console.log("[puzzle] wrong attempt", {
          puzzleId: activePuzzle.id,
          attemptedMove,
          expectedMove: activePuzzle.expectedBestMove
        });
        setAction("snapback");
        setHadWrongAttempt(true);
        setStatus(`Not quite. The puzzle expects a stronger move than ${attemptedMove}.`);
        return;
      }

      try {
        const chess = new Chess(activePuzzle.fen);
        const result = chess.move({
          from,
          to,
          promotion: activePuzzle.expectedBestMove.length > 4 ? activePuzzle.expectedBestMove.slice(4) : undefined
        });
        if (!result) {
          setAction("snapback");
          return;
        }

        console.log("[puzzle] solved", {
          puzzleId: activePuzzle.id,
          attemptedMove,
          expectedLine: activePuzzle.expectedLine
        });

        setAction("drop");
        board.setPosition(chess.fen(), true);
        setSolved(true);
        setStatus(`Correct. Best line: ${activePuzzle.expectedLine.join(" ")}`);

        void recordPuzzleAttemptLocal({
          puzzleId: activePuzzle.id,
          result: "success",
          quality: qualityFromAttempt({ result: "success", hintsUsed: hintsUsedRef.current, revealed: false, firstTry: !hadWrongAttemptRef.current }),
          elapsedMs: Date.now() - startedAtRef.current,
          hintsUsed: hintsUsedRef.current,
          revealed: false,
          attemptedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("[puzzle] move application failed", { puzzleId: activePuzzle.id, error });
        setAction("snapback");
      }
    });

    return () => {
      console.log("[puzzle] destroy board", { puzzleId: puzzle.id });
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

    const highlightedSquares = lastOpponentMove ? [lastOpponentMove.from, lastOpponentMove.to] : [];
    console.log("[puzzle] update board", {
      puzzleId: puzzle.id,
      sideToMove: puzzle.sideToMove,
      fen: puzzle.fen,
      highlightedSquares
    });
    boardRef.current.setOrientation(puzzle.sideToMove === "b" ? "black" : "white");
    boardRef.current.setPosition(puzzle.fen, false);
    boardRef.current.setHighlightedSquares(highlightedSquares);
  }, [lastOpponentMove, puzzle]);

  useEffect(() => {
    setStatus("Play the best move for the side to move.");
    setHintsUsed(0);
    setRevealed(false);
    setSolved(false);
    setHadWrongAttempt(false);
    setStartedAt(Date.now());
  }, [puzzleId]);

  if (puzzleData === undefined) {
    return <section className="page"><p>Loading puzzle...</p></section>;
  }

  if (!puzzle) {
    return <section className="page"><p>Puzzle not found.</p></section>;
  }

  const activePuzzle = puzzle;

  async function revealSolution() {
    console.log("[puzzle] reveal solution", {
      puzzleId: activePuzzle.id,
      expectedBestMove: activePuzzle.expectedBestMove
    });
    setRevealed(true);
    setStatus(`Solution: ${activePuzzle.expectedBestMove} - ${activePuzzle.expectedLine.join(" ")}`);
    await recordPuzzleAttemptLocal({
      puzzleId: activePuzzle.id,
      result: "fail",
      quality: qualityFromAttempt({ result: "fail", hintsUsed, revealed: true, firstTry: false }),
      elapsedMs: Date.now() - startedAt,
      hintsUsed,
      revealed: true,
      attemptedAt: new Date().toISOString()
    });
  }

  return (
    <section className="page">
      <h2>{activePuzzle.classification.toUpperCase()} puzzle</h2>
      <p className="muted">Difficulty {activePuzzle.difficulty}/5 - Due {new Date(activePuzzle.schedule.dueAt).toLocaleString()}</p>
      <div className="game-layout">
        <div>
          <div ref={boardHostRef} className="board-host" />
          <div className="controls">
            <button className="action-button" onClick={() => { setHintsUsed((value) => value + 1); setStatus(`Hint: look at ${activePuzzle.expectedBestMove.slice(0, 2)}.`); }}>Hint</button>
            <button className="action-button" onClick={() => void revealSolution()} disabled={revealed}>Reveal</button>
          </div>
          <p>{status}</p>
        </div>
        <div className="moves-pane">
          <h3>Puzzle details</h3>
          <p className="muted">{sideLabel(activePuzzle.sideToMove)}</p>
          <p className="muted">Opponent last move: {lastOpponentMove ? moveLabel(activePuzzle.source.ply - 1, lastOpponentMove.san) : "Starting position"}</p>
          <p className="muted">Themes: {activePuzzle.themes.join(", ")}</p>
          <p className="muted">Eval swing: {activePuzzle.evalSwing}</p>
          <p className="muted">Last reviewed: {activePuzzle.schedule.lastReviewedAt ? new Date(activePuzzle.schedule.lastReviewedAt).toLocaleString() : "never"}</p>
          <p className="muted">Attempts: {stats?.attempts ?? attempts.length}</p>
          <p className="muted">Success rate: {Math.round((stats?.overallSuccessRate ?? 0) * 100)}%</p>
        </div>
      </div>
    </section>
  );
}
