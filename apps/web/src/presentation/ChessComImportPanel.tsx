import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Label } from "../components/ui/label.js";
import type { ChessComArchiveMonth } from "../domain/types.js";

type ChessComImportPanelProps = {
  username: string;
  archives: ChessComArchiveMonth[];
  loadingArchives: boolean;
  importing: boolean;
  status: string;
  startMonthId: string;
  endMonthId: string;
  backofficeHref: string;
  onDiscoverArchives: () => void;
  onStartMonthChange: (value: string) => void;
  onEndMonthChange: (value: string) => void;
  onImport: () => void;
};

export function ChessComImportPanel(props: ChessComImportPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Chess.com archive import</CardTitle>
        <p className="text-sm text-muted-foreground">Import finished Chess.com archive months into the local library using the saved Backoffice username.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!props.username ? (
          <p className="text-sm text-muted-foreground">
            Configure a Chess.com username in <a href={props.backofficeHref} className="underline hover:text-foreground">Backoffice</a> before importing archive months.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Saved username: <strong className="text-foreground">{props.username}</strong></p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={props.onDiscoverArchives} disabled={props.loadingArchives || props.importing}>
                {props.loadingArchives ? "Loading archives..." : "Load archive months"}
              </Button>
              <Button
                size="sm"
                onClick={props.onImport}
                disabled={props.importing || props.loadingArchives || props.archives.length === 0 || !props.startMonthId || !props.endMonthId}
              >
                {props.importing ? "Importing archives..." : "Import selected archive range"}
              </Button>
            </div>

            {props.archives.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
                <Label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">Start month</span>
                  <select
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={props.startMonthId}
                    onChange={(event) => props.onStartMonthChange(event.target.value)}
                  >
                    {props.archives.map((archive) => (
                      <option key={archive.id} value={archive.id}>{archive.label}</option>
                    ))}
                  </select>
                </Label>

                <Label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">End month</span>
                  <select
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={props.endMonthId}
                    onChange={(event) => props.onEndMonthChange(event.target.value)}
                  >
                    {props.archives.map((archive) => (
                      <option key={archive.id} value={archive.id}>{archive.label}</option>
                    ))}
                  </select>
                </Label>
              </div>
            ) : null}
          </>
        )}

        <p className="text-sm">{props.status}</p>
      </CardContent>
    </Card>
  );
}
