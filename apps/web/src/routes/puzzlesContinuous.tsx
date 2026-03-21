import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  buildContinuousPuzzleQueue,
  removeContinuousPuzzle,
  requeueContinuousPuzzle,
  type ContinuousPuzzlePhase,
  type ContinuousPuzzleQueue
} from "../domain/continuousPuzzleSession";
import { buildPuzzleStats } from "../domain/puzzles";
import { useGame, usePuzzleBank } from "../lib/runtimeGateway";
import { PuzzleTrainer, type PuzzleTrainerResolution } from "../presentation/PuzzleTrainer";

type ContinuousSessionState = {
  queues: ContinuousPuzzleQueue;
  completedCount: number;
  queuedRetryIds: string[];
  totalCount: number;
};

function currentPhase(queues: ContinuousPuzzleQueue): ContinuousPuzzlePhase | null {
  if (queues.blunder.length > 0) {
    return "blunder";
  }
  if (queues.mistake.length > 0) {
    return "mistake";
  }
  return null;
}

function createSessionState(queues: ContinuousPuzzleQueue): ContinuousSessionState {
  return {
    queues,
    completedCount: 0,
    queuedRetryIds: [],
    totalCount: queues.blunder.length + queues.mistake.length
  };
}

function phaseLabel(phase: ContinuousPuzzlePhase | null): string {
  if (phase === "mistake") {
    return "Mistakes";
  }
  if (phase === "blunder") {
    return "Blunders";
  }
  return "Complete";
}

export function ContinuousPuzzlesPage() {
  const bank = usePuzzleBank();
  const [session, setSession] = useState<ContinuousSessionState | null>(null);

  useEffect(() => {
    if (!bank || session) {
      return;
    }

    setSession(createSessionState(buildContinuousPuzzleQueue(bank.puzzles, bank.attempts, new Date().toISOString())));
  }, [bank, session]);

  const activePhase = session ? currentPhase(session.queues) : null;
  const activePuzzleId = activePhase ? session?.queues[activePhase][0] ?? null : null;
  const puzzleById = useMemo(() => new Map((bank?.puzzles ?? []).map((puzzle) => [puzzle.id, puzzle])), [bank?.puzzles]);
  const activePuzzle = activePuzzleId ? puzzleById.get(activePuzzleId) ?? null : null;
  const activeAttempts = useMemo(
    () => (activePuzzleId ? (bank?.attempts ?? []).filter((attempt) => attempt.puzzleId === activePuzzleId) : []),
    [activePuzzleId, bank?.attempts]
  );
  const activeStats = activePuzzle ? buildPuzzleStats(activePuzzle, activeAttempts) : null;
  const game = useGame(activePuzzle?.gameId ?? "");

  if (!bank || !session) {
    return <section className="page"><p>Loading continuous puzzle mode...</p></section>;
  }

  if (session.totalCount === 0) {
    return (
      <section className="page stack-gap">
        <div>
          <h2>Continuous puzzle mode</h2>
          <p className="muted">No eligible personal blunder or mistake puzzles are available yet. Analyze your games first so the app can generate your own training positions.</p>
        </div>
        <p><Link to="/puzzles">Back to puzzle bank</Link></p>
      </section>
    );
  }

  async function handleAttemptResolved(resolution: PuzzleTrainerResolution) {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const phase = currentPhase(current.queues);
      if (!phase) {
        return current;
      }

      const activeQueue = current.queues[phase];
      if (!activeQueue.includes(resolution.puzzleId)) {
        return current;
      }

      if (resolution.outcome === "success") {
        return {
          ...current,
          queues: {
            ...current.queues,
            [phase]: removeContinuousPuzzle(activeQueue, resolution.puzzleId)
          },
          completedCount: current.completedCount + 1,
          queuedRetryIds: current.queuedRetryIds.filter((id) => id !== resolution.puzzleId)
        };
      }

      return {
        ...current,
        queues: {
          ...current.queues,
          [phase]: requeueContinuousPuzzle(activeQueue, resolution.puzzleId, 3)
        },
        queuedRetryIds: current.queuedRetryIds.includes(resolution.puzzleId)
          ? current.queuedRetryIds
          : [...current.queuedRetryIds, resolution.puzzleId]
      };
    });
  }

  if (!activePuzzle || !activePhase) {
    return (
      <section className="page stack-gap">
        <div>
          <h2>Continuous puzzle mode</h2>
          <p className="muted">Session complete. You cleared your current blunder-first personal queue.</p>
        </div>
        <div className="session-box continuous-session-box">
          <strong>Completed</strong>
          <span className="muted">{session.completedCount} solved in this run</span>
          <span className="muted">{session.queuedRetryIds.length} retries still pending in the discarded session state</span>
        </div>
        <p><Link to="/puzzles">Back to puzzle bank</Link></p>
      </section>
    );
  }

  const remainingInPhase = session.queues[activePhase].length;
  const currentPosition = Math.min(session.totalCount, session.completedCount + 1);

  return (
    <section className="page stack-gap">
      <div>
        <h2>Continuous puzzle mode</h2>
        <p className="muted">Train only your own puzzles, starting with blunders. Due puzzles come first, weaker spots repeat more often, and mistakes unlock only after the blunder queue is empty.</p>
      </div>
      <PuzzleTrainer
        puzzle={activePuzzle}
        game={game ?? null}
        attempts={activeAttempts}
        stats={activeStats}
        onAttemptResolved={handleAttemptResolved}
        summary={(
          <div className="session-box continuous-session-box">
            <strong>{phaseLabel(activePhase)}</strong>
            <span className="muted">Puzzle {currentPosition} of {session.totalCount}</span>
            <span className="muted">Remaining in phase: {remainingInPhase}</span>
            <span className="muted">Queued retries: {session.queuedRetryIds.length}</span>
          </div>
        )}
      />
      <p className="muted">Current puzzle: {activePuzzle.classification.toUpperCase()} | Difficulty {activePuzzle.difficulty}/5</p>
    </section>
  );
}
