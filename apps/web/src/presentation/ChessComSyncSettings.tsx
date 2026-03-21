import type { ChessComSyncConfig } from "../domain/types.js";

type ChessComSyncSettingsProps = {
  config: ChessComSyncConfig;
  status: string;
  running: boolean;
  saving: boolean;
  saveStatus: string | null;
  onUsernameChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
  onIntervalChange: (value: ChessComSyncConfig["interval"]) => void;
  onSave: () => void;
};

export function ChessComSyncSettings(props: ChessComSyncSettingsProps) {
  return (
    <div className="config-notice">
      <strong>Chess.com sync</strong>
      <p className="muted">Manage the saved Chess.com username and the browser-side cadence used for checking new finished archive months while the app is open.</p>
      <div className="config-grid">
        <label className="config-field">
          <span className="config-label">Username</span>
          <input
            className="config-input"
            value={props.config.username}
            onChange={(event) => props.onUsernameChange(event.target.value)}
            placeholder="hikaru"
          />
          <span className="muted config-help">This is the single saved username used by the import page and browser sync.</span>
        </label>

        <label className="config-field">
          <span className="config-label">Sync enabled</span>
          <input
            className="config-checkbox"
            type="checkbox"
            checked={props.config.enabled}
            onChange={(event) => props.onEnabledChange(event.target.checked)}
          />
          <span className="muted config-help">Sync checks only run while this app is open.</span>
        </label>

        <label className="config-field">
          <span className="config-label">Sync cadence</span>
          <select
            className="puzzle-select"
            value={props.config.interval}
            onChange={(event) => props.onIntervalChange(event.target.value === "weekly" ? "weekly" : "daily")}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <span className="muted config-help">Used for due checks after the initial manual import establishes a sync cursor.</span>
        </label>
      </div>

      <div className="inline-actions">
        <button type="button" className="action-button" onClick={props.onSave} disabled={props.saving}>
          {props.saving ? "Saving..." : "Save Chess.com settings"}
        </button>
      </div>

      <p className="muted">Current sync status: {props.running ? "Sync in progress..." : props.status}</p>
      <p className="muted">Last sync attempt: {props.config.lastSyncAt ?? "Never"}</p>
      {props.saveStatus ? <p className="muted">{props.saveStatus}</p> : null}
    </div>
  );
}
