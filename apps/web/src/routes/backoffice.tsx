import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sharedAnalysisCoordinator } from "../application/analysisCoordinator";
import { sharedChessComSyncCoordinator } from "../application/chessComSyncCoordinator";
import {
  ANALYSIS_COORDINATOR_INTERVAL_MAX_MS,
  ANALYSIS_COORDINATOR_INTERVAL_MIN_MS
} from "../domain/analysisCoordinatorConfig";
import { validateChessComSyncConfig } from "../domain/chessComSyncConfig";
import {
  PUZZLE_PLAYBACK_CONFIG_DEFAULTS,
  PUZZLE_PLAYBACK_STEP_MAX_MS,
  PUZZLE_PLAYBACK_STEP_MIN_MS
} from "../domain/puzzlePlaybackConfig";
import { formatUnknownError } from "../lib/formatUnknownError";
import { runtimeGateway, useRuntimeSession } from "../lib/runtimeGateway";
import { ChessComSyncSettings } from "../presentation/ChessComSyncSettings";
import { buildBackofficeConfigSections } from "../presentation/backofficeView";

const ANALYSIS_COORDINATOR_INTERVAL_MIN_SECONDS = ANALYSIS_COORDINATOR_INTERVAL_MIN_MS / 1000;
const ANALYSIS_COORDINATOR_INTERVAL_MAX_SECONDS = ANALYSIS_COORDINATOR_INTERVAL_MAX_MS / 1000;

export function BackofficePage() {
  const sections = buildBackofficeConfigSections();
  const session = useRuntimeSession();
  const coordinator = useSyncExternalStore(
    (listener) => sharedAnalysisCoordinator.subscribe(listener),
    () => sharedAnalysisCoordinator.getSnapshot()
  );
  const chessComCoordinator = useSyncExternalStore(
    (listener) => sharedChessComSyncCoordinator.subscribe(listener),
    () => sharedChessComSyncCoordinator.getSnapshot()
  );
  const [enabled, setEnabled] = useState(coordinator.config.enabled);
  const [intervalSeconds, setIntervalSeconds] = useState(String(coordinator.config.intervalMs / 1000));
  const [puzzlePlaybackStepMs, setPuzzlePlaybackStepMs] = useState(String(PUZZLE_PLAYBACK_CONFIG_DEFAULTS.stepMs));
  const [chessComUsername, setChessComUsername] = useState(chessComCoordinator.config.username);
  const [chessComEnabled, setChessComEnabled] = useState(chessComCoordinator.config.enabled);
  const [chessComInterval, setChessComInterval] = useState(chessComCoordinator.config.interval);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [puzzlePlaybackSaveStatus, setPuzzlePlaybackSaveStatus] = useState<string | null>(null);
  const [chessComSaveStatus, setChessComSaveStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPuzzlePlayback, setSavingPuzzlePlayback] = useState(false);
  const [savingChessCom, setSavingChessCom] = useState(false);

  useEffect(() => {
    sharedAnalysisCoordinator.ensureStarted();
    sharedChessComSyncCoordinator.ensureStarted();
  }, []);

  useEffect(() => {
    setEnabled(coordinator.config.enabled);
    setIntervalSeconds(String(Math.round(coordinator.config.intervalMs / 1000)));
  }, [coordinator.config.enabled, coordinator.config.intervalMs]);

  useEffect(() => {
    setChessComUsername(chessComCoordinator.config.username);
    setChessComEnabled(chessComCoordinator.config.enabled);
    setChessComInterval(chessComCoordinator.config.interval);
  }, [
    chessComCoordinator.config.enabled,
    chessComCoordinator.config.interval,
    chessComCoordinator.config.username
  ]);

  useEffect(() => {
    let active = true;
    void runtimeGateway.getPuzzlePlaybackConfig().then((config) => {
      if (active) {
        setPuzzlePlaybackStepMs(String(config.stepMs));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function saveRuntimeSettings() {
    setSaving(true);
    setSaveStatus(null);
    try {
      await sharedAnalysisCoordinator.updateConfig({
        enabled,
        intervalMs: Number(intervalSeconds) * 1000
      });
      setSaveStatus("Lazy-analysis settings saved.");
    } catch (error) {
      setSaveStatus(`Failed to save lazy-analysis settings: ${formatUnknownError(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function savePuzzlePlaybackSettings() {
    setSavingPuzzlePlayback(true);
    setPuzzlePlaybackSaveStatus(null);
    try {
      await runtimeGateway.savePuzzlePlaybackConfig({
        stepMs: Number(puzzlePlaybackStepMs)
      });
      setPuzzlePlaybackSaveStatus("Puzzle playback settings saved.");
    } catch (error) {
      setPuzzlePlaybackSaveStatus(`Failed to save puzzle playback settings: ${formatUnknownError(error)}`);
    } finally {
      setSavingPuzzlePlayback(false);
    }
  }

  async function saveChessComSettings() {
    setSavingChessCom(true);
    setChessComSaveStatus(null);

    const nextConfig = {
      ...chessComCoordinator.config,
      username: chessComUsername,
      enabled: chessComEnabled,
      interval: chessComInterval
    } as const;
    const validationError = validateChessComSyncConfig({
      username: nextConfig.username.trim().toLowerCase(),
      enabled: nextConfig.enabled,
      interval: nextConfig.interval,
      lastSyncAt: chessComCoordinator.config.lastSyncAt,
      lastSuccessfulArchive: chessComCoordinator.config.lastSuccessfulArchive,
      lastStatus: chessComCoordinator.config.lastStatus
    });

    if (validationError) {
      setChessComSaveStatus(validationError);
      setSavingChessCom(false);
      return;
    }

    try {
      await sharedChessComSyncCoordinator.updateConfig(nextConfig);
      setChessComSaveStatus("Chess.com settings saved.");
    } catch (error) {
      setChessComSaveStatus(`Failed to save Chess.com settings: ${formatUnknownError(error)}`);
    } finally {
      setSavingChessCom(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Backoffice</h2>
        <p className="text-sm text-muted-foreground">Review the analysis and puzzle-classification constants currently shipped with the web app.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lazy library analysis</CardTitle>
          <p className="text-sm text-muted-foreground">Control whether the app automatically scans the library for unanalyzed games in the background. Foreground analysis from the game page still works even when this is disabled.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Enabled</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={enabled}
                  onCheckedChange={(checked) => setEnabled(checked === true)}
                />
                <span className="text-xs text-muted-foreground leading-snug">Turns background library analysis on or off without affecting explicit user-triggered analysis.</span>
              </div>
            </div>

            <Label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Check interval (seconds)</span>
              <Input
                type="number"
                min={ANALYSIS_COORDINATOR_INTERVAL_MIN_SECONDS}
                max={ANALYSIS_COORDINATOR_INTERVAL_MAX_SECONDS}
                step={1}
                value={intervalSeconds}
                onChange={(event) => setIntervalSeconds(event.target.value)}
              />
              <span className="text-xs text-muted-foreground leading-snug">Clamped to {ANALYSIS_COORDINATOR_INTERVAL_MIN_SECONDS}s - {ANALYSIS_COORDINATOR_INTERVAL_MAX_SECONDS}s and applied to the next scan cycle.</span>
            </Label>
          </div>
          <Button size="sm" onClick={() => void saveRuntimeSettings()} disabled={!session.canMutate || saving}>
            {saving ? "Saving..." : "Save lazy-analysis settings"}
          </Button>
          <p className="text-sm text-muted-foreground">Current runtime status: {coordinator.status}</p>
          {saveStatus ? <p className="text-sm text-muted-foreground">{saveStatus}</p> : null}
        </CardContent>
      </Card>

      <ChessComSyncSettings
        config={{
          ...chessComCoordinator.config,
          username: chessComUsername,
          enabled: chessComEnabled,
          interval: chessComInterval
        }}
        status={chessComCoordinator.status}
        running={chessComCoordinator.running}
        saving={savingChessCom}
        saveStatus={chessComSaveStatus}
        onUsernameChange={setChessComUsername}
        onEnabledChange={setChessComEnabled}
        onIntervalChange={setChessComInterval}
        onSave={() => void saveChessComSettings()}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Puzzle playback</CardTitle>
          <p className="text-sm text-muted-foreground">Control the animation speed used when the puzzle board reveals or continues the stored solution line.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            <Label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Playback step (ms)</span>
              <Input
                type="number"
                min={PUZZLE_PLAYBACK_STEP_MIN_MS}
                max={PUZZLE_PLAYBACK_STEP_MAX_MS}
                step={25}
                value={puzzlePlaybackStepMs}
                onChange={(event) => setPuzzlePlaybackStepMs(event.target.value)}
              />
              <span className="text-xs text-muted-foreground leading-snug">Clamped to {PUZZLE_PLAYBACK_STEP_MIN_MS}ms - {PUZZLE_PLAYBACK_STEP_MAX_MS}ms. The shipped default is {PUZZLE_PLAYBACK_CONFIG_DEFAULTS.stepMs}ms.</span>
            </Label>
          </div>
          <Button size="sm" onClick={() => void savePuzzlePlaybackSettings()} disabled={!session.canMutate || savingPuzzlePlayback}>
            {savingPuzzlePlayback ? "Saving..." : "Save puzzle playback settings"}
          </Button>
          {puzzlePlaybackSaveStatus ? <p className="text-sm text-muted-foreground">{puzzlePlaybackSaveStatus}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">FITL explorer</CardTitle>
          <p className="text-sm text-muted-foreground">Open the FITL explorer to start from a global feature map, then deepen into architecture or implementation for the selected vertical or tool.</p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/backoffice/fitl-map">Open FITL map</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Benchmark tools</CardTitle>
          <p className="text-sm text-muted-foreground">Run the bundled `single.pgn` benchmark to compare movetime-driven runtime cost across the currently supported worker knobs.</p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/backoffice/analysis-benchmark">Open analysis benchmark</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hardcoded config</CardTitle>
          <p className="text-sm text-muted-foreground">These sections remain read-only and come directly from source constants. The lazy-analysis runtime control above is persisted separately through local backoffice state.</p>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
                {section.fields.map((field) => (
                  <Label key={field.key} className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">{field.label}</span>
                    <Input value={field.value} readOnly aria-readonly="true" />
                    <span className="text-xs text-muted-foreground leading-snug">{field.help}</span>
                  </Label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
