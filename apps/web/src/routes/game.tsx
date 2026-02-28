import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import type { GameRecord } from "../domain/types";
import { getGame } from "../lib/storage/repositories/gamesRepo";
import { getLatestAnalysisRunByGameId } from "../lib/storage/repositories/analysisRepo";
import { ANALYSIS_POLICY } from "../domain/analysisPolicy";

export function GamePage() {
  const { gameId } = useParams({ from: "/game/$gameId" });
  const [game, setGame] = useState<GameRecord | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string>("No analysis run yet.");

  useEffect(() => {
    getGame(gameId).then(setGame).catch(() => setGame(null));
    getLatestAnalysisRunByGameId(gameId)
      .then((run) => {
        if (!run) return;
        setAnalysisSummary(
          `${run.engineName} ${run.engineVersion} (${run.engineFlavor}) depth=${run.options.depth} status=${run.status}`
        );
      })
      .catch(() => setAnalysisSummary("Failed to load analysis summary."));
  }, [gameId]);

  return (
    <section className="page">
      <h2>Game {gameId}</h2>
      <p className="muted">
        Viewer scaffold only. Board adapter, move list, and worker analysis wiring are next tickets.
      </p>
      {!game ? <p>Game not found.</p> : null}
      {game ? (
        <>
          <p>
            <strong>{game.headers.White ?? "White"}</strong> vs <strong>{game.headers.Black ?? "Black"}</strong>
          </p>
          <p>Hash: {game.hash}</p>
        </>
      ) : null}
      <h3>Analysis policy</h3>
      <ul>
        <li>Default depth: {ANALYSIS_POLICY.defaultDepth}</li>
        <li>Long game threshold: {ANALYSIS_POLICY.longGameMinPlies} plies</li>
        <li>Very long threshold: {ANALYSIS_POLICY.veryLongGameMinPlies} plies</li>
      </ul>
      <h3>Latest analysis</h3>
      <p>{analysisSummary}</p>
    </section>
  );
}
