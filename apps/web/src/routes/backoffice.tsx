import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { sharedAnalysisCoordinator } from "../application/analysisCoordinator";
import {
  ANALYSIS_COORDINATOR_INTERVAL_MAX_MS,
  ANALYSIS_COORDINATOR_INTERVAL_MIN_MS
} from "../domain/analysisCoordinatorConfig";
import {
  PUZZLE_PLAYBACK_CONFIG_DEFAULTS,
  PUZZLE_PLAYBACK_STEP_MAX_MS,
  PUZZLE_PLAYBACK_STEP_MIN_MS
} from "../domain/puzzlePlaybackConfig";
import { formatUnknownError } from "../lib/formatUnknownError";
import { getPuzzlePlaybackConfig, savePuzzlePlaybackConfig } from "../lib/storage/repositories/appMetaRepo";
import { buildBackofficeConfigSections } from "../presentation/backofficeView";

const ANALYSIS_COORDINATOR_INTERVAL_MIN_SECONDS = ANALYSIS_COORDINATOR_INTERVAL_MIN_MS / 1000;
const ANALYSIS_COORDINATOR_INTERVAL_MAX_SECONDS = ANALYSIS_COORDINATOR_INTERVAL_MAX_MS / 1000;

export function BackofficePage() {
  const sections = buildBackofficeConfigSections();
  const coordinator = useSyncExternalStore(
    (listener) => sharedAnalysisCoordinator.subscribe(listener),
    () => sharedAnalysisCoordinator.getSnapshot()
  );
  const [enabled, setEnabled] = useState(coordinator.config.enabled);
  const [intervalSeconds, setIntervalSeconds] = useState(String(coordinator.config.intervalMs / 1000));
  const [puzzlePlaybackStepMs, setPuzzlePlaybackStepMs] = useState(String(PUZZLE_PLAYBACK_CONFIG_DEFAULTS.stepMs));
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [puzzlePlaybackSaveStatus, setPuzzlePlaybackSaveStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPuzzlePlayback, setSavingPuzzlePlayback] = useState(false);

  useEffect(() => {
    sharedAnalysisCoordinator.ensureStarted();
  }, []);

  useEffect(() => {
    setEnabled(coordinator.config.enabled);
    setIntervalSeconds(String(Math.round(coordinator.config.intervalMs / 1000)));
  }, [coordinator.config.enabled, coordinator.config.intervalMs]);

  useEffect(() => {
    let active = true;
    void getPuzzlePlaybackConfig().then((config) => {
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
      await savePuzzlePlaybackConfig({
        stepMs: Number(puzzlePlaybackStepMs)
      });
      setPuzzlePlaybackSaveStatus("Puzzle playback settings saved.");
    } catch (error) {
      setPuzzlePlaybackSaveStatus(`Failed to save puzzle playback settings: ${formatUnknownError(error)}`);
    } finally {
      setSavingPuzzlePlayback(false);
    }
  }

  return (
    <section className="page stack-gap">
      <div>
        <h2>Backoffice</h2>
        <p className="muted">Review the analysis and puzzle-classification constants currently shipped with the web app.</p>
      </div>

      <div className="config-notice">
        <strong>Lazy library analysis</strong>
        <p className="muted">Control whether the app automatically scans the library for unanalyzed games in the background. Foreground analysis from the game page still works even when this is disabled.</p>
        <div className="config-grid">
          <label className="config-field">
            <span className="config-label">Enabled</span>
            <input
              className="config-checkbox"
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span className="muted config-help">Turns background library analysis on or off without affecting explicit user-triggered analysis.</span>
          </label>

          <label className="config-field">
            <span className="config-label">Check interval (seconds)</span>
            <input
              className="config-input"
              type="number"
              min={ANALYSIS_COORDINATOR_INTERVAL_MIN_SECONDS}
              max={ANALYSIS_COORDINATOR_INTERVAL_MAX_SECONDS}
              step={1}
              value={intervalSeconds}
              onChange={(event) => setIntervalSeconds(event.target.value)}
            />
            <span className="muted config-help">Clamped to {ANALYSIS_COORDINATOR_INTERVAL_MIN_SECONDS}s - {ANALYSIS_COORDINATOR_INTERVAL_MAX_SECONDS}s and applied to the next scan cycle.</span>
          </label>
        </div>
        <div className="inline-actions">
          <button type="button" className="action-button" onClick={() => void saveRuntimeSettings()} disabled={saving}>
            {saving ? "Saving..." : "Save lazy-analysis settings"}
          </button>
        </div>
        <p className="muted">Current runtime status: {coordinator.status}</p>
        {saveStatus ? <p className="muted">{saveStatus}</p> : null}
      </div>

      <div className="config-notice">
        <strong>Puzzle playback</strong>
        <p className="muted">Control the animation speed used when the puzzle board reveals or continues the stored solution line.</p>
        <div className="config-grid">
          <label className="config-field">
            <span className="config-label">Playback step (ms)</span>
            <input
              className="config-input"
              type="number"
              min={PUZZLE_PLAYBACK_STEP_MIN_MS}
              max={PUZZLE_PLAYBACK_STEP_MAX_MS}
              step={25}
              value={puzzlePlaybackStepMs}
              onChange={(event) => setPuzzlePlaybackStepMs(event.target.value)}
            />
            <span className="muted config-help">Clamped to {PUZZLE_PLAYBACK_STEP_MIN_MS}ms - {PUZZLE_PLAYBACK_STEP_MAX_MS}ms. The shipped default is {PUZZLE_PLAYBACK_CONFIG_DEFAULTS.stepMs}ms.</span>
          </label>
        </div>
        <div className="inline-actions">
          <button type="button" className="action-button" onClick={() => void savePuzzlePlaybackSettings()} disabled={savingPuzzlePlayback}>
            {savingPuzzlePlayback ? "Saving..." : "Save puzzle playback settings"}
          </button>
        </div>
        {puzzlePlaybackSaveStatus ? <p className="muted">{puzzlePlaybackSaveStatus}</p> : null}
      </div>

      <div className="config-notice">
        <strong>FITL explorer</strong>
        <p className="muted">Open the FITL explorer to start from a global feature map, then deepen into architecture or implementation for the selected vertical or tool.</p>
        <div className="inline-actions">
          <Link to="/backoffice/fitl-map" className="action-button">Open FITL map</Link>
        </div>
      </div>

      <div className="config-notice">
        <strong>Benchmark tools</strong>
        <p className="muted">Run the bundled `single.pgn` benchmark to compare movetime-driven runtime cost across the currently supported worker knobs.</p>
        <div className="inline-actions">
          <Link to="/backoffice/analysis-benchmark" className="action-button">Open analysis benchmark</Link>
        </div>
      </div>

      <div className="config-notice">
        <strong>Hardcoded config</strong>
        <p className="muted">These sections remain read-only and come directly from source constants.</p>
        <p className="muted">The lazy-analysis runtime control above is persisted separately through local backoffice state.</p>
      </div>

      <div className="config-sections">
        {sections.map((section) => (
          <section key={section.id} className="config-section">
            <div className="config-section-header">
              <h3>{section.title}</h3>
              <p className="muted">{section.description}</p>
            </div>

            <div className="config-grid">
              {section.fields.map((field) => (
                <label key={field.key} className="config-field">
                  <span className="config-label">{field.label}</span>
                  <input className="config-input" value={field.value} readOnly aria-readonly="true" />
                  <span className="muted config-help">{field.help}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
