import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { parsePgnCollection } from "@chess-trainer/chess-core";
import singlePgn from "../../../../assets/icons/single.pgn?raw";
import { runAnalysisBenchmark } from "../application/runAnalysisBenchmark";
import { InlineLoader } from "../components/InlineLoader";
import { useDelayedBusy } from "../components/useDelayedBusy";
import { ANALYSIS_BENCHMARK_REPETITIONS, buildAnalysisBenchmarkScenarios } from "../domain/analysisBenchmark";
import { buildReplayData, moveToUci } from "../domain/gameReplay";
import type { GameRecord } from "../domain/types";
import { EngineClient } from "../engine/engineClient";
import { formatUnknownError } from "../lib/formatUnknownError";
import {
  clearBenchmarkAnalysisData,
  listBenchmarkPlyAnalysisByRunId,
  saveBenchmarkAnalysisRun,
  saveBenchmarkPlyAnalysis
} from "../lib/storage/repositories/benchmarkAnalysisRepo";
import {
  buildAnalysisBenchmarkBlockedRows,
  buildAnalysisBenchmarkKnobRows,
  buildAnalysisBenchmarkResultRows,
  buildAnalysisBenchmarkScenarioCards
} from "../presentation/analysisBenchmarkView";
import { buildGameMetaChips } from "../presentation/gameView";

function buildBenchmarkGame(): { game: GameRecord; totalPlies: number; moveSanList: string[]; fenPositions: string[] } {
  const parsed = parsePgnCollection(singlePgn);
  const candidate = parsed.find((game) => game.hasMoves);
  if (!candidate) {
    throw new Error("Benchmark PGN does not contain a playable game.");
  }

  const replayData = buildReplayData(candidate.normalized, "startpos");
  const createdAt = new Date("2026-03-10T00:00:00.000Z").toISOString();

  return {
    game: {
      id: "benchmark-single-pgn",
      userId: "benchmark-user",
      schemaVersion: 1,
      hash: "benchmark-single-pgn",
      pgn: candidate.normalized,
      headers: candidate.headers,
      initialFen: "startpos",
      movesUci: replayData.moves.map(moveToUci),
      source: "upload",
      createdAt,
      updatedAt: createdAt
    },
    totalPlies: replayData.moves.length,
    moveSanList: replayData.moves.map((move) => move.san),
    fenPositions: replayData.fenPositions
  };
}

export function AnalysisBenchmarkPage() {
  const benchmarkGame = useMemo(() => buildBenchmarkGame(), []);
  const benchmarkMeta = useMemo(
    () => buildGameMetaChips(benchmarkGame.game, benchmarkGame.totalPlies),
    [benchmarkGame]
  );
  const scenarios = useMemo(() => buildAnalysisBenchmarkScenarios(), []);
  const scenarioCards = useMemo(() => buildAnalysisBenchmarkScenarioCards(), []);
  const benchmarkKnobs = useMemo(() => buildAnalysisBenchmarkKnobRows(), []);
  const blockedKnobs = useMemo(() => buildAnalysisBenchmarkBlockedRows(), []);
  const [status, setStatus] = useState("Run the benchmark to compare scenario timing on the bundled `single.pgn` game.");
  const [summary, setSummary] = useState<string | null>(null);
  const [results, setResults] = useState<ReturnType<typeof buildAnalysisBenchmarkResultRows>>([]);
  const [failure, setFailure] = useState<{
    scenarioLabel: string;
    repetition: number;
    failedStep: string;
    message: string;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const showLoader = useDelayedBusy(running, { delayMs: 200, minVisibleMs: 350 });

  async function onRunBenchmark() {
    setRunning(true);
    setSummary(null);
    setResults([]);
    setFailure(null);
    setStatus(`Preparing ${scenarios.length} scenarios across ${ANALYSIS_BENCHMARK_REPETITIONS} repetitions each...`);
    console.log("[benchmark-page] benchmark start", {
      gameId: benchmarkGame.game.id,
      totalPlies: benchmarkGame.totalPlies,
      scenarios: scenarios.map((scenario) => scenario.id),
      repetitions: ANALYSIS_BENCHMARK_REPETITIONS
    });

    try {
      const output = await runAnalysisBenchmark({
        game: benchmarkGame.game,
        fenPositions: benchmarkGame.fenPositions,
        moveSanList: benchmarkGame.moveSanList,
        totalPlies: benchmarkGame.totalPlies,
        scenarios,
        repetitions: ANALYSIS_BENCHMARK_REPETITIONS,
        createEngine: () => new EngineClient(),
        saveRun: saveBenchmarkAnalysisRun,
        savePly: saveBenchmarkPlyAnalysis,
        listPlyAnalysisByRunId: listBenchmarkPlyAnalysisByRunId,
        clearStorage: clearBenchmarkAnalysisData,
        onProgress: (progress) => {
          console.log("[benchmark-page] progress", progress);
          setStatus(progress.message);
          if (progress.phase === "failed-scenario" && progress.failedStep) {
            setFailure({
              scenarioLabel: progress.scenarioLabel,
              repetition: progress.repetition,
              failedStep: progress.failedStep,
              message: progress.message
            });
          }
        }
      });

      const completed = output.scenarios.filter((result) => result.status === "completed").length;
      const skipped = output.scenarios.filter((result) => result.status === "skipped").length;
      const failed = output.scenarios.find((result) => result.status === "failed");
      console.log("[benchmark-page] benchmark complete", {
        completed,
        skipped,
        failed: failed
          ? {
              scenario: failed.scenario.label,
              failedStep: failed.failedStep,
              failedRepetition: failed.failedRepetition,
              reason: failed.reason
            }
          : null
      });
      setResults(buildAnalysisBenchmarkResultRows(output.scenarios));
      if (failed && failed.status === "failed") {
        const failureMessage = `${failed.scenario.label} run ${failed.failedRepetition} failed during ${failed.failedStep}: ${failed.reason}`;
        setFailure({
          scenarioLabel: failed.scenario.label,
          repetition: failed.failedRepetition,
          failedStep: failed.failedStep,
          message: failureMessage
        });
        setSummary(`Finished ${completed} scenario${completed === 1 ? "" : "s"} with ${skipped} skipped and 1 failed.`);
        setStatus(failureMessage);
      } else {
        setSummary(`Finished ${completed} scenario${completed === 1 ? "" : "s"} with ${skipped} skipped.`);
        setStatus("Benchmark run completed.");
      }
    } catch (error) {
      const message = formatUnknownError(error, "Benchmark run failed.");
      console.error("[benchmark-page] benchmark crashed", {
        gameId: benchmarkGame.game.id,
        message,
        error
      });
      setFailure({
        scenarioLabel: "Benchmark",
        repetition: 0,
        failedStep: "analysis-execution",
        message
      });
      setStatus(message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="page stack-gap">
      <div className="stack-gap">
        <div className="inline-actions">
          <Link to="/backoffice" className="action-button">Back to backoffice</Link>
        </div>

        <div>
          <h2>Analysis Benchmark</h2>
          <p className="muted">Run the real browser-worker analysis pipeline against the bundled `single.pgn` game and compare movetime-driven timing across fixed benchmark scenarios.</p>
        </div>

        <div className="chip-row" aria-label="Benchmark game details">
          {benchmarkMeta.map((chip) => (
            <span key={chip.id} className="chip">{chip.text}</span>
          ))}
          <span className="chip">{benchmarkGame.totalPlies} plies</span>
          <span className="chip">{ANALYSIS_BENCHMARK_REPETITIONS} repetitions per scenario</span>
        </div>
      </div>

      <div className="config-notice">
        <strong>Interpretation note</strong>
        <p className="muted">This single benchmark game is useful for calibrating short-game runtime expectations. It is not sufficient on its own to retune long-game sampling thresholds.</p>
      </div>

      <section className="config-section">
        <div className="config-section-header">
          <h3>Tweakable Runtime Knobs</h3>
          <p className="muted">Only settings that are wired into the shipped worker path are included in this benchmark.</p>
        </div>

        <div className="config-grid">
          {benchmarkKnobs.map((field) => (
            <label key={field.key} className="config-field">
              <span className="config-label">{field.label}</span>
              <input className="config-input" value={field.value} readOnly aria-readonly="true" />
              <span className="muted config-help">{field.help}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="config-section">
        <div className="config-section-header">
          <h3>Not Benchmarkable Yet</h3>
          <p className="muted">These knobs are intentionally excluded until the runtime actually applies them.</p>
        </div>

        <div className="config-grid">
          {blockedKnobs.map((field) => (
            <label key={field.key} className="config-field">
              <span className="config-label">{field.label}</span>
              <input className="config-input" value="Not supported in v1" readOnly aria-readonly="true" />
              <span className="muted config-help">{field.reason}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="config-section">
        <div className="config-section-header">
          <h3>Standard Sweep</h3>
          <p className="muted">Fixed v1 scenario set for movetime-first runtime comparison.</p>
        </div>

        <div className="benchmark-scenario-grid">
          {scenarioCards.map((scenario) => (
            <article key={scenario.id} className="benchmark-scenario-card">
              <strong>{scenario.title}</strong>
              <p className="muted">{scenario.description}</p>
              <p className="muted">{scenario.settingsSummary}</p>
              {scenario.comparisonNote ? <p className="muted">{scenario.comparisonNote}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <div className="stack-gap">
        <div className="inline-actions">
          <button className="action-button" onClick={() => void onRunBenchmark()} disabled={running}>
            {running ? "Running benchmark..." : "Run benchmark"}
          </button>
        </div>

        <p>{status}</p>
        {summary ? <p className="muted">{summary}</p> : null}
        {failure ? (
          <div className="config-notice">
            <strong>Failure details</strong>
            <p className="muted">Scenario: {failure.scenarioLabel} · Run: {failure.repetition || "n/a"} · Step: {failure.failedStep}</p>
            <p>{failure.message}</p>
          </div>
        ) : null}
        {showLoader ? <InlineLoader inline label="Running benchmark" detail="Executing repeated analysis runs through the worker pipeline." /> : null}
      </div>

      <section className="config-section">
        <div className="config-section-header">
          <h3>Results</h3>
          <p className="muted">Use these values to compare scenario cost, project full-run runtime, and size a safer derived budget for similar short games.</p>
        </div>

        {results.length === 0 ? (
          <p className="muted">No benchmark results yet.</p>
        ) : (
          <div className="benchmark-table-wrap">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Runs</th>
                  <th>Avg run ms</th>
                  <th>P95 run ms</th>
                  <th>Avg ply ms</th>
                  <th>P95 ply ms</th>
                  <th>Avg analyzed plies</th>
                  <th>Retries/run</th>
                  <th>Safety stops</th>
                  <th>Projected full run</th>
                  <th>Recommended safety budget</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.id}>
                    <td>{row.scenario}</td>
                    <td>{row.runsCompleted}</td>
                    <td>{row.avgRunMs}</td>
                    <td>{row.p95RunMs}</td>
                    <td>{row.avgPlyMs}</td>
                    <td>{row.p95PlyMs}</td>
                    <td>{row.avgAnalyzedPlies}</td>
                    <td>{row.retriesPerRun}</td>
                    <td>{row.safetyStops}</td>
                    <td>{row.projectedFullRunMs}</td>
                    <td>{row.recommendedSafetyBudgetMs}</td>
                    <td>{row.statusText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
