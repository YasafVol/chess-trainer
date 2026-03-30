import { ChangeEvent, FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InlineLoader } from "../components/InlineLoader";
import { useDelayedBusy } from "../components/useDelayedBusy";
import { discoverChessComArchiveMonths, importChessComArchiveRange } from "../application/chessComImport";
import { sharedChessComSyncCoordinator } from "../application/chessComSyncCoordinator";
import { buildImportPreviews, importSelectedPreviews } from "../application/importGames";
import { ChessComImportPanel } from "../presentation/ChessComImportPanel";
import type { ChessComArchiveMonth, GameRecord, ImportPreviewGame } from "../domain/types";
import { useGames, useRuntimeSession } from "../lib/runtimeGateway";

const EMPTY_GAMES: GameRecord[] = [];

function previewId(preview: Pick<ImportPreviewGame, "index" | "hash">): string {
  return `${preview.index}:${preview.hash}`;
}

export function ImportPage() {
  const session = useRuntimeSession();
  const existingGames = useGames() ?? EMPTY_GAMES;
  const chessComCoordinator = useSyncExternalStore(
    (listener) => sharedChessComSyncCoordinator.subscribe(listener),
    () => sharedChessComSyncCoordinator.getSnapshot()
  );
  const [rawInput, setRawInput] = useState("");
  const [status, setStatus] = useState("Paste a PGN or upload a file to begin.");
  const [busy, setBusy] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [previews, setPreviews] = useState<ImportPreviewGame[]>([]);
  const [chessComArchives, setChessComArchives] = useState<ChessComArchiveMonth[]>([]);
  const [chessComStatus, setChessComStatus] = useState("Configure a Chess.com username in Backoffice to import archive months.");
  const [loadingChessComArchives, setLoadingChessComArchives] = useState(false);
  const [importingChessComArchives, setImportingChessComArchives] = useState(false);
  const [startMonthId, setStartMonthId] = useState("");
  const [endMonthId, setEndMonthId] = useState("");
  const [source, setSource] = useState<"paste" | "upload">("paste");

  const showParseLoader = useDelayedBusy(isReadingFile || isParsing, { delayMs: 180, minVisibleMs: 400 });
  const showImportLoader = useDelayedBusy(busy, { delayMs: 180, minVisibleMs: 400 });

  useEffect(() => {
    let cancelled = false;

    async function buildPreviews() {
      if (!rawInput.trim()) {
        setPreviews([]);
        setStatus("Paste a PGN or upload a file to begin.");
        setIsParsing(false);
        return;
      }

      setIsParsing(true);
      console.log("[import] build previews", {
        source,
        rawLength: rawInput.length
      });

      const next = await buildImportPreviews({
        rawInput,
        source,
        existingGames
      });

      if (cancelled) {
        return;
      }

      console.log("[import] previews ready", {
        source,
        count: next.length,
        selectable: next.filter((preview) => !preview.duplicateOfGameId).length
      });

      setPreviews(next);
      setStatus(
        next.length > 0
          ? `Parsed ${next.length} game${next.length === 1 ? "" : "s"}. Select the ones you want to import.`
          : "No valid games were parsed from this PGN input."
      );
      setIsParsing(false);
    }

    void buildPreviews().catch((error) => {
      if (!cancelled) {
        setStatus(error instanceof Error ? error.message : "Failed to parse the PGN input.");
        setIsParsing(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [existingGames, rawInput, source]);

  useEffect(() => {
    if (!chessComCoordinator.config.username) {
      setChessComArchives([]);
      setStartMonthId("");
      setEndMonthId("");
      setChessComStatus("Configure a Chess.com username in Backoffice to import archive months.");
      return;
    }

    setChessComStatus((current) =>
      current.startsWith("Configure a Chess.com username")
        ? "Load the available Chess.com archive months, then choose a bounded range to import."
        : current
    );
  }, [chessComCoordinator.config.username]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsReadingFile(true);
    try {
      const text = await file.text();
      console.log("[import] file selected", {
        name: file.name,
        size: file.size
      });
      setSource("upload");
      setRawInput(text);
      setStatus(`Loaded ${file.name}. Parsing PGN...`);
    } finally {
      setIsReadingFile(false);
    }
  }

  function togglePreview(targetId: string) {
    setPreviews((current) => {
      const next = current.map((preview) =>
        previewId(preview) === targetId ? { ...preview, selected: !preview.selected } : preview
      );
      const changed = next.find((preview) => previewId(preview) === targetId);
      console.log("[import] toggle preview", {
        targetId,
        selected: changed?.selected
      });
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const selected = previews.filter((preview) => preview.selected && !preview.duplicateOfGameId);
    if (selected.length === 0) {
      setStatus("Select at least one non-duplicate game to import.");
      return;
    }

    setBusy(true);
    try {
      setStatus(`Importing ${selected.length} game${selected.length === 1 ? "" : "s"}...`);
      const result = await importSelectedPreviews(selected);
      setStatus(`Imported ${result.imported} game(s). Skipped ${result.skippedDuplicates} duplicates and ${result.skippedInvalid} invalid entries.`);
      setPreviews((current) => current.map((preview) => ({ ...preview, selected: false })));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadChessComArchives() {
    if (!chessComCoordinator.config.username) {
      setChessComStatus("Configure a Chess.com username in Backoffice before loading archives.");
      return;
    }

    setLoadingChessComArchives(true);
    try {
      const archives = await discoverChessComArchiveMonths(chessComCoordinator.config.username);
      setChessComArchives(archives);
      if (archives.length === 0) {
        setStartMonthId("");
        setEndMonthId("");
        setChessComStatus("No finished Chess.com archive months were available for this username.");
      } else {
        setStartMonthId(archives[0].id);
        setEndMonthId(archives[archives.length - 1].id);
        setChessComStatus(`Loaded ${archives.length} archive month(s). Choose a bounded date range to import.`);
      }
    } catch (error) {
      setChessComStatus(error instanceof Error ? error.message : "Failed to load Chess.com archives.");
    } finally {
      setLoadingChessComArchives(false);
    }
  }

  async function importChessComArchives() {
    if (!chessComCoordinator.config.username) {
      setChessComStatus("Configure a Chess.com username in Backoffice before importing archives.");
      return;
    }
    if (!startMonthId || !endMonthId) {
      setChessComStatus("Load the available archive months, then choose a valid start and end month.");
      return;
    }

    setImportingChessComArchives(true);
    try {
      const result = await importChessComArchiveRange({
        username: chessComCoordinator.config.username,
        startMonthId,
        endMonthId
      });
      setChessComStatus(result.statusMessage);
      await sharedChessComSyncCoordinator.applyManualImportResult(result);
    } catch (error) {
      setChessComStatus(error instanceof Error ? error.message : "Chess.com archive import failed.");
    } finally {
      setImportingChessComArchives(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Import PGN</h2>
        <p className="text-sm text-muted-foreground">Paste PGN text or upload a `.pgn` file. Multi-game collections are split into individual preview rows.</p>
        {!session.canMutate ? <p className="mt-1 text-sm text-muted-foreground">Import is disabled while signed out or offline. Reconnect to save games.</p> : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Label htmlFor="pgn-input">PGN text</Label>
        <Textarea
          id="pgn-input"
          value={rawInput}
          onChange={(event) => {
            setSource("paste");
            setRawInput(event.target.value);
          }}
          rows={14}
          className="font-mono text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".pgn,text/plain" onChange={onFileChange} className="text-sm" />
          <Button
            type="submit"
            disabled={!session.canMutate || busy || previews.every((preview) => !preview.selected || !!preview.duplicateOfGameId)}
          >
            <Upload className="size-4" />
            {busy ? "Importing..." : "Import selected games"}
          </Button>
        </div>
      </form>

      <p className="text-sm">{status}</p>
      {showParseLoader ? <InlineLoader label="Processing PGN" detail="Reading and splitting the collection into individual games." /> : null}
      {showImportLoader ? <InlineLoader label="Importing games" detail="Saving selected games into your Convex-backed library." /> : null}

      <ChessComImportPanel
        username={chessComCoordinator.config.username}
        archives={chessComArchives}
        loadingArchives={loadingChessComArchives}
        importing={importingChessComArchives}
        status={chessComStatus}
        startMonthId={startMonthId}
        endMonthId={endMonthId}
        backofficeHref="/backoffice"
        onDiscoverArchives={() => void loadChessComArchives()}
        onStartMonthChange={setStartMonthId}
        onEndMonthChange={setEndMonthId}
        onImport={() => void importChessComArchives()}
      />

      {previews.length > 0 ? (
        <div className="space-y-3">
          {previews.map((preview) => {
            const id = previewId(preview);
            return (
              <div
                key={id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-border/80 hover:bg-muted/30 cursor-pointer"
                role="button"
                tabIndex={preview.duplicateOfGameId ? -1 : 0}
                onClick={() => {
                  if (!preview.duplicateOfGameId) {
                    togglePreview(id);
                  }
                }}
                onKeyDown={(event) => {
                  if (preview.duplicateOfGameId) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePreview(id);
                  }
                }}
              >
                <Checkbox
                  checked={preview.selected}
                  disabled={!!preview.duplicateOfGameId}
                  onCheckedChange={() => togglePreview(id)}
                  onClick={(event) => event.stopPropagation()}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <strong className="text-sm">{preview.headers.White ?? "White"} vs {preview.headers.Black ?? "Black"}</strong>
                  <p className="text-xs text-muted-foreground">Hash: {preview.hash} - Moves: {preview.movesUci.length}</p>
                  <p className="text-xs text-muted-foreground">{preview.headers.Event ?? "Unknown event"}</p>
                  {preview.duplicateOfGameId ? <p className="text-xs text-amber-600">Already imported as {preview.duplicateOfGameId}.</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
