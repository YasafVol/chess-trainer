import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { parsePgnCollection } from "@chess-trainer/chess-core";
import singlePgn from "../../../../assets/icons/single.pgn?raw";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-5">
      <div className="space-y-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/backoffice"><ArrowLeft className="size-3.5" />Back to backoffice</Link>
        </Button>

        <div>
          <h2 className="text-lg font-semibold">Analysis Benchmark</h2>
          <p className="text-sm text-muted-foreground">Run the real browser-worker analysis pipeline against the bundled `single.pgn` game and compare movetime-driven timing across fixed benchmark scenarios.</p>
        </div>

        <div className="flex flex-wrap gap-1.5" aria-label="Benchmark game details">
          {benchmarkMeta.map((chip) => (
            <Badge key={chip.id} variant="outline">{chip.text}</Badge>
          ))}
          <Badge variant="outline">{benchmarkGame.totalPlies} plies</Badge>
          <Badge variant="outline">{ANALYSIS_BENCHMARK_REPETITIONS} repetitions per scenario</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Interpretation note:</strong> This single benchmark game is useful for calibrating short-game runtime expectations. It is not sufficient on its own to retune long-game sampling thresholds.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tweakable Runtime Knobs</CardTitle>
          <p className="text-sm text-muted-foreground">Only settings that are wired into the shipped worker path are included in this benchmark.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            {benchmarkKnobs.map((field) => (
              <Label key={field.key} className="flex flex-col gap-2">
                <span className="text-sm font-semibold">{field.label}</span>
                <Input value={field.value} readOnly aria-readonly="true" />
                <span className="text-xs text-muted-foreground leading-snug">{field.help}</span>
              </Label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Not Benchmarkable Yet</CardTitle>
          <p className="text-sm text-muted-foreground">These knobs are intentionally excluded until the runtime actually applies them.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            {blockedKnobs.map((field) => (
              <Label key={field.key} className="flex flex-col gap-2">
                <span className="text-sm font-semibold">{field.label}</span>
                <Input value="Not supported in v1" readOnly aria-readonly="true" />
                <span className="text-xs text-muted-foreground leading-snug">{field.reason}</span>
              </Label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Standard Sweep</CardTitle>
          <p className="text-sm text-muted-foreground">Fixed v1 scenario set for movetime-first runtime comparison.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {scenarioCards.map((scenario) => (
              <div key={scenario.id} className="rounded-xl border border-border p-3.5 bg-card space-y-1">
                <strong className="text-sm">{scenario.title}</strong>
                <p className="text-xs text-muted-foreground">{scenario.description}</p>
                <p className="text-xs text-muted-foreground">{scenario.settingsSummary}</p>
                {scenario.comparisonNote ? <p className="text-xs text-muted-foreground">{scenario.comparisonNote}</p> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button onClick={() => void onRunBenchmark()} disabled={running}>
          {running ? "Running benchmark..." : "Run benchmark"}
        </Button>

        <p className="text-sm">{status}</p>
        {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
        {failure ? (
          <Card className="border-destructive/40">
            <CardContent className="p-4 space-y-1">
              <strong className="text-sm">Failure details</strong>
              <p className="text-xs text-muted-foreground">Scenario: {failure.scenarioLabel} | Run: {failure.repetition || "n/a"} | Step: {failure.failedStep}</p>
              <p className="text-sm text-destructive">{failure.message}</p>
            </CardContent>
          </Card>
        ) : null}
        {showLoader ? <InlineLoader inline label="Running benchmark" detail="Executing repeated analysis runs through the worker pipeline." /> : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Results</CardTitle>
          <p className="text-sm text-muted-foreground">Use these values to compare scenario cost, project full-run runtime, and size a safer derived budget for similar short games.</p>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No benchmark results yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2.5 font-semibold text-xs">Scenario</th>
                    <th className="p-2.5 font-semibold text-xs">Runs</th>
                    <th className="p-2.5 font-semibold text-xs">Avg run ms</th>
                    <th className="p-2.5 font-semibold text-xs">P95 run ms</th>
                    <th className="p-2.5 font-semibold text-xs">Avg ply ms</th>
                    <th className="p-2.5 font-semibold text-xs">P95 ply ms</th>
                    <th className="p-2.5 font-semibold text-xs">Avg analyzed plies</th>
                    <th className="p-2.5 font-semibold text-xs">Retries/run</th>
                    <th className="p-2.5 font-semibold text-xs">Safety stops</th>
                    <th className="p-2.5 font-semibold text-xs">Projected full run</th>
                    <th className="p-2.5 font-semibold text-xs">Recommended safety budget</th>
                    <th className="p-2.5 font-semibold text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="p-2.5">{row.scenario}</td>
                      <td className="p-2.5">{row.runsCompleted}</td>
                      <td className="p-2.5">{row.avgRunMs}</td>
                      <td className="p-2.5">{row.p95RunMs}</td>
                      <td className="p-2.5">{row.avgPlyMs}</td>
                      <td className="p-2.5">{row.p95PlyMs}</td>
                      <td className="p-2.5">{row.avgAnalyzedPlies}</td>
                      <td className="p-2.5">{row.retriesPerRun}</td>
                      <td className="p-2.5">{row.safetyStops}</td>
                      <td className="p-2.5">{row.projectedFullRunMs}</td>
                      <td className="p-2.5">{row.recommendedSafetyBudgetMs}</td>
                      <td className="p-2.5">{row.statusText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
