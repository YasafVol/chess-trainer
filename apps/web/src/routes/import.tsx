import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { parsePgnCollection, shortHash } from "@chess-trainer/chess-core";
import type { ImportPreviewGame } from "../domain/types";
import { buildReplayData, moveToUci } from "../domain/gameReplay";
import { importBatchLocal, useLocalGames } from "../lib/mockData";

export function ImportPage() {
  const existingGames = useLocalGames() ?? [];
  const [rawInput, setRawInput] = useState("");
  const [status, setStatus] = useState("Paste a PGN or upload a file to begin.");
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<ImportPreviewGame[]>([]);
  const [source, setSource] = useState<"paste" | "upload">("paste");

  const existingByHash = useMemo(() => {
    const map = new Map<string, string>();
    for (const game of existingGames) {
      map.set(game.hash, game.id);
    }
    return map;
  }, [existingGames]);

  useEffect(() => {
    let cancelled = false;

    async function buildPreviews() {
      if (!rawInput.trim()) {
        setPreviews([]);
        setStatus("Paste a PGN or upload a file to begin.");
        return;
      }

      const parsed = parsePgnCollection(rawInput);
      const next: ImportPreviewGame[] = [];

      for (const game of parsed) {
        if (!game.hasMoves) {
          continue;
        }

        try {
          const replayData = buildReplayData(game.normalized, "startpos");
          const hash = await shortHash(game.normalized);
          next.push({
            index: game.index,
            normalized: game.normalized,
            hash,
            headers: game.headers,
            movesUci: replayData.moves.map(moveToUci),
            hasMoves: game.hasMoves,
            duplicateOfGameId: existingByHash.get(hash),
            selected: !existingByHash.has(hash),
            source
          });
        } catch {
          // Ignore invalid sub-games during preview.
        }
      }

      if (cancelled) {
        return;
      }

      setPreviews(next);
      setStatus(
        next.length > 0
          ? `Parsed ${next.length} game${next.length === 1 ? "" : "s"}. Select the ones you want to import.`
          : "No valid games were parsed from this PGN input."
      );
    }

    void buildPreviews();
    return () => {
      cancelled = true;
    };
  }, [existingByHash, rawInput, source]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setSource("upload");
    setRawInput(text);
  }

  function togglePreview(index: number) {
    setPreviews((current) =>
      current.map((preview) => (preview.index === index ? { ...preview, selected: !preview.selected } : preview))
    );
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
      const now = new Date().toISOString();
      const result = await importBatchLocal(
        selected.map((preview) => ({
          id: crypto.randomUUID(),
          schemaVersion: 1,
          hash: preview.hash,
          pgn: preview.normalized,
          headers: preview.headers,
          initialFen: "startpos",
          movesUci: preview.movesUci,
          source: preview.source,
          createdAt: now,
          updatedAt: now
        }))
      );
      setStatus(`Imported ${result.imported} game(s). Skipped ${result.skippedDuplicates} duplicates and ${result.skippedInvalid} invalid entries.`);
      setPreviews((current) => current.map((preview) => ({ ...preview, selected: false })));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <h2>Import PGN</h2>
      <p className="muted">Paste PGN text or upload a `.pgn` file. Multi-game collections are split into individual preview rows.</p>
      <form onSubmit={onSubmit} className="stack-gap">
        <label htmlFor="pgn-input">PGN text</label>
        <textarea
          id="pgn-input"
          value={rawInput}
          onChange={(event) => {
            setSource("paste");
            setRawInput(event.target.value);
          }}
          rows={14}
          className="full-width-textarea"
        />
        <div className="inline-actions">
          <input type="file" accept=".pgn,text/plain" onChange={onFileChange} />
          <button type="submit" disabled={busy || previews.every((preview) => !preview.selected || !!preview.duplicateOfGameId)}>
            {busy ? "Importing..." : "Import selected games"}
          </button>
        </div>
      </form>
      <p>{status}</p>

      {previews.length > 0 ? (
        <div className="preview-list">
          {previews.map((preview) => (
            <label key={`${preview.hash}-${preview.index}`} className="preview-card">
              <input
                type="checkbox"
                checked={preview.selected}
                disabled={!!preview.duplicateOfGameId}
                onChange={() => togglePreview(preview.index)}
              />
              <div>
                <strong>{preview.headers.White ?? "White"} vs {preview.headers.Black ?? "Black"}</strong>
                <p className="muted">Hash: {preview.hash} · Moves: {preview.movesUci.length}</p>
                <p className="muted">{preview.headers.Event ?? "Unknown event"}</p>
                {preview.duplicateOfGameId ? <p>Already imported as {preview.duplicateOfGameId}.</p> : null}
              </div>
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}
