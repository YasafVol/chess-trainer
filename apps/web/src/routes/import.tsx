import { FormEvent, useMemo, useState } from "react";
import { normalizePgnInput, extractHeaders, shortHash } from "@chess-trainer/chess-core";
import { saveGame } from "../lib/storage/repositories/gamesRepo";

export function ImportPage() {
  const [pgn, setPgn] = useState("");
  const [status, setStatus] = useState<string>("Paste a PGN to begin.");
  const [busy, setBusy] = useState(false);

  const normalized = useMemo(() => normalizePgnInput(pgn), [pgn]);
  const hasMoves = /\d+\./.test(normalized);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!hasMoves || busy) return;
    setBusy(true);
    try {
      const headers = extractHeaders(normalized);
      const hash = await shortHash(normalized);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await saveGame({
        id,
        schemaVersion: 1,
        hash,
        pgn: normalized,
        headers,
        initialFen: "startpos",
        movesUci: [],
        createdAt: now,
        updatedAt: now
      });
      setStatus(`Saved game ${id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save game.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <h2>Import PGN</h2>
      <p className="muted">This scaffold validates and stores games locally in IndexedDB.</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="pgn-input">PGN</label>
        <textarea
          id="pgn-input"
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          rows={14}
          style={{ width: "100%", marginTop: 8 }}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={!hasMoves || busy}>
            {busy ? "Saving..." : "Save game"}
          </button>
          <span className="muted">{hasMoves ? "Looks like PGN moves are present." : "Moves not detected yet."}</span>
        </div>
      </form>
      <p style={{ marginTop: 12 }}>{status}</p>
    </section>
  );
}
