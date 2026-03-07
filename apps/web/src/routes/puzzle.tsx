import { useEffect, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { ChessboardElementAdapter } from "../board/ChessboardElementAdapter";
import type { BoardAdapter } from "../board/BoardAdapter";
import { qualityFromAttempt } from "../domain/puzzles";
import { recordPuzzleAttemptLocal, useLocalPuzzleDetails } from "../lib/mockData";

export function PuzzlePage() {
  const { puzzleId } = useParams({ from: "/puzzles/$puzzleId" });
  const puzzleData = useLocalPuzzleDetails(puzzleId);
  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<BoardAdapter | null>(null);
  const [status, setStatus] = useState("Play the best move for the side to move.");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());

  const puzzle = puzzleData?.puzzle ?? null;
  const attempts = puzzleData?.attempts ?? [];
  const stats = puzzleData?.stats ?? null;

  useEffect(() => {
    if (!boardHostRef.current || !puzzle) {
      return;
    }

    const activePuzzle = puzzle;
    const board = new ChessboardElementAdapter();
    board.mount(boardHostRef.current);
    boardRef.current = board;
    board.setPosition(activePuzzle.fen, false);
    board.setOrientation(activePuzzle.sideToMove === "b" ? "black" : "white");

    const unbindDrop = board.onDrop(({ from, to, setAction }) => {
      if (solved) {
        setAction("snapback");
        return;
      }

      const attemptedMove = `${from}${to}`;
      if (attemptedMove !== activePuzzle.expectedBestMove.slice(0, 4)) {
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

        setAction("drop");
        board.setPosition(chess.fen(), true);
        setSolved(true);
        setStatus(`Correct. Best line: ${activePuzzle.expectedLine.join(" ")}`);

        void recordPuzzleAttemptLocal({
          puzzleId: activePuzzle.id,
          result: "success",
          quality: qualityFromAttempt({ result: "success", hintsUsed, revealed: false, firstTry: !hadWrongAttempt }),
          elapsedMs: Date.now() - startedAt,
          hintsUsed,
          revealed: false,
          attemptedAt: new Date().toISOString()
        });
      } catch {
        setAction("snapback");
      }
    });

    return () => {
      unbindDrop();
      board.destroy();
      boardRef.current = null;
    };
  }, [hadWrongAttempt, hintsUsed, puzzle, solved, startedAt]);

  useEffect(() => {
    setStatus("Play the best move for the side to move.");
    setHintsUsed(0);
    setRevealed(false);
    setSolved(false);
    setHadWrongAttempt(false);
    setStartedAt(Date.now());
  }, [puzzleId]);

  if (puzzleData === undefined) {
    return <section className="page"><p>Loading puzzle…</p></section>;
  }

  if (!puzzle) {
    return <section className="page"><p>Puzzle not found.</p></section>;
  }

  const activePuzzle = puzzle;

  async function revealSolution() {
    setRevealed(true);
    setStatus(`Solution: ${activePuzzle.expectedBestMove} · ${activePuzzle.expectedLine.join(" ")}`);
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
      <p className="muted">Difficulty {activePuzzle.difficulty}/5 · Due {new Date(activePuzzle.schedule.dueAt).toLocaleString()}</p>
      <div className="game-layout">
        <div>
          <div ref={boardHostRef} className="board-host" />
          <div className="controls">
            <button onClick={() => { setHintsUsed((value) => value + 1); setStatus(`Hint: look at ${activePuzzle.expectedBestMove.slice(0, 2)}.`); }}>Hint</button>
            <button onClick={() => void revealSolution()} disabled={revealed}>Reveal</button>
          </div>
          <p>{status}</p>
        </div>
        <div className="moves-pane">
          <h3>Puzzle details</h3>
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
