import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Checkbox } from "../components/ui/checkbox.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Chess.com sync</CardTitle>
        <p className="text-sm text-muted-foreground">Manage the saved Chess.com username and the browser-side cadence used for checking new finished archive months while the app is open.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          <Label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Username</span>
            <Input
              value={props.config.username}
              onChange={(event) => props.onUsernameChange(event.target.value)}
              placeholder="hikaru"
            />
            <span className="text-xs text-muted-foreground leading-snug">This is the single saved username used by the import page and browser sync.</span>
          </Label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Sync enabled</span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={props.config.enabled}
                onCheckedChange={(checked) => props.onEnabledChange(checked === true)}
              />
              <span className="text-xs text-muted-foreground">Sync checks only run while this app is open.</span>
            </div>
          </div>

          <Label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Sync cadence</span>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={props.config.interval}
              onChange={(event) => props.onIntervalChange(event.target.value === "weekly" ? "weekly" : "daily")}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <span className="text-xs text-muted-foreground leading-snug">Used for due checks after the initial manual import establishes a sync cursor.</span>
          </Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={props.onSave} disabled={props.saving}>
            {props.saving ? "Saving..." : "Save Chess.com settings"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">Current sync status: {props.running ? "Sync in progress..." : props.status}</p>
        <p className="text-sm text-muted-foreground">Last sync attempt: {props.config.lastSyncAt ?? "Never"}</p>
        {props.saveStatus ? <p className="text-sm text-muted-foreground">{props.saveStatus}</p> : null}
      </CardContent>
    </Card>
  );
}
