# Obsidian Chess Trainer — **V0 Single-File Spec (Updated)**
Version: 0.2.0 • Scope: Modal import → note with board • **Bundled libs:** chess.js (BSD-2), chessboard-element (MIT)

## 0) Vision
- **V0 (this):** Paste PGN via modal → create note with frontmatter + chessboard renderer + controls. Full PGN support (SAN/headers) handled by `chess.js`. Filename includes player names and Elo.
- **V1:** On submission, also create a second note: analyzed game with Stockfish (WASM) annotations and a compact eval graph.
- **V2:** Add API fetchers (Chess.com, Chessly) to ingest recent games.
- **V3:** Generate puzzles from blunders/mistakes with hidden solutions.

> Dependencies are **bundled** with the plugin. No network/CDN at runtime.

---

## 1) UX Requirements (V0)
1) **Left ribbon button**: “Chess Trainer.”  
2) **Hotkey command**: default `Ctrl+Alt+P` (macOS: `Ctrl+Opt+P`). If Obsidian conflicts, user can remap in Hotkeys.  
3) **PGN import modal**:
   - Multiline textarea for raw PGN.
   - “Create Note” and “Cancel.”
   - Validation: non-empty PGN with at least one header or move number.
4) **Note renderer**:
   - Fenced code block ```chess-pgn``` containing the original PGN.
   - Inline board viewer driven by `chess.js` + `<chess-board>` with **basic controls**:
     - Prev ⟵, Next ⟶, Reset ↻, Play/Pause ▶/⏸, Flip ⤾
   - Move list with current move highlighted; smooth autoplay ~500 ms/ply.

---

## 2) Filenames, Frontmatter, Creation Date
- **Folder:** `Chess/games/` (create if missing).  
- **Filename:** `YYYY-MM-DD White(WhiteElo)-vs-Black(BlackElo) Result <hash8>.md`  
  - If Elo missing, omit the `(Elo)` part for that player.
- **Frontmatter (keys)**
```yaml
---
source: manual
created: "YYYY-MM-DDTHH:mm:ssZ"        # now
event: "<Event|''>"
site: "<Site|''>"
date: "YYYY.MM.DD"                      # PGN header if present
white: "<White>"
white_elo: <number|null>
black: "<Black>"
black_elo: <number|null>
result: "1-0" | "0-1" | "1/2-1/2" | "*"
time_control: "<TimeControl|''>"
eco: "<ECO|''>"
opening: "<Opening|''>"
hash: "<sha1-of-pgn>"
---
```

Header fields read from PGN if available (common in Chess.com exports): `Event, Site, Date, White, Black, Result, TimeControl, ECO, Opening, WhiteElo, BlackElo`.

---

## 3) Architecture (V0)
```
src/
  deps/                 # vendored/bundled
    chess.js            # ESM build
    chessboard-element  # web component
  services/
    CreateNoteFromPGN.ts    # parse headers, build note, write
  ui/
    ImportModal.ts          # paste-PGN modal
    Renderer.ts             # code block processor + board + controls
    styles.css              # minimal styling
  adapters/
    NoteRepo.ts             # upsert into vault
  main.ts                   # ribbon + command + hotkey + registration
```

- **Why libs now?** Full algebraic coverage isn’t worth reinventing. `chess.js` parses PGN reliably, including promotions, checks/mates, disambiguation, en passant, castling, comments, and variations. `chessboard-element` renders a board with a clean API.
- **No runtime fetches:** libs are bundled with the plugin; no CDN.

---

## 4) Data Flow (V0)
1. User clicks ribbon or presses `Ctrl+Alt+P`.
2. Modal opens → paste PGN → “Create Note.”
3. `CreateNoteFromPGN`:
   1) Parse headers with `chess.js` (`loadPgn` or manual header scrape).  
   2) Compute SHA‑1 of the raw PGN for stable naming.  
   3) Build frontmatter and body with fenced ```chess-pgn``` including the **original PGN**.  
   4) Upsert into `Chess/games/`.
4. On note render, the `chess-pgn` processor uses `chess.js` to replay moves and `<chess-board>` to display positions and controls.

---

## 5) Commands & Hotkeys
- Command: **“Chess Trainer: Import PGN”**  
- Default hotkey: `Ctrl+Alt+P` (macOS: `Ctrl+Opt+P`). Obsidian lets users remap if it collides.

---

## 6) Pseudocode (selected)

### main.ts
```ts
import { App, Plugin, Notice } from "obsidian";
import "deps/chessboard-element.js";       // registers <chess-board>
import { ImportModal } from "./ui/ImportModal";
import { createNoteFromPGN } from "./services/CreateNoteFromPGN";

export default class ChessTrainer extends Plugin {
  async onload() {
    this.addRibbonIcon("dice", "Chess Trainer", () => this.openImportModal());

    this.addCommand({
      id: "chess-import-pgn",
      name: "Import PGN",
      callback: () => this.openImportModal(),
      hotkeys: [{ modifiers: ["Ctrl", "Alt"], key: "p" }]
    });

    this.registerMarkdownCodeBlockProcessor("chess-pgn", async (src, el) => {
      const { renderViewer } = await import("./ui/Renderer");
      renderViewer(src, el);
    });
  }

  private openImportModal() {
    new ImportModal(this.app, async (pgn) => {
      try {
        const note = await createNoteFromPGN(this.app, pgn, { outDir: "Chess/games" });
        new Notice(`Created: ${note.path}`);
      } catch (e) {
        new Notice("Failed to create note. Check PGN.");
        console.error(e);
      }
    }).open();
  }
}
```

### services/CreateNoteFromPGN.ts
```ts
import { App, moment } from "obsidian";
import { upsert } from "../adapters/NoteRepo";
import { sha1 } from "../util/sha1";
import { Chess } from "deps/chess.js";

export async function createNoteFromPGN(app: App, pgn: string, opts: { outDir: string }) {
  const created = new Date().toISOString();
  const hash = await sha1(pgn);

  // Parse headers via chess.js
  const game = new Chess();
  game.loadPgn(pgn, { sloppy: true });
  const headers = game.header(); // { Event, Site, Date, White, Black, Result, ... }

  const white = headers.White || "White";
  const black = headers.Black || "Black";
  const whiteElo = parseInt(headers.WhiteElo || headers.WhiteRating || "") || null;
  const blackElo = parseInt(headers.BlackElo || headers.BlackRating || "") || null;
  const dateIso = headers.Date && /^\d{4}\.\d{2}\.\d{2}$/.test(headers.Date) ? headers.Date.replace(/\./g, "-") : moment().format("YYYY-MM-DD");
  const result = headers.Result || "*";

  // Filename
  const wName = white.replace(/[\/\\:*?"<>|]/g, "_");
  const bName = black.replace(/[\/\\:*?"<>|]/g, "_");
  const wTag = whiteElo ? f"{wName}({whiteElo})" : wName;
  const bTag = blackElo ? f"{bName}({blackElo})" : bName;
  const fname = `${dateIso} ${wTag}-vs-${bTag} ${result} ${hash.slice(0,8)}.md`;
  const path = `${opts.outDir}/${fname}`;

  const fm = {
    source: "manual",
    created,
    event: headers.Event || "",
    site: headers.Site || "",
    date: headers.Date || "",
    white, white_elo: whiteElo,
    black, black_elo: blackElo,
    result,
    time_control: headers.TimeControl || "",
    eco: headers.ECO || "",
    opening: headers.Opening || "",
    hash
  };

  const body = [
    "---",
    ...Object.entries(fm).map(([k,v]) => `${k}: ${JSON.stringify(v)}`),
    "---",
    "",
    "```chess-pgn",
    pgn.trim(),
    "```"
  ].join("\n");

  await upsert(app.vault, path, body);
  return { path };
}
```

### ui/Renderer.ts
```ts
import { Chess } from "deps/chess.js";

export function renderViewer(pgn: string, el: HTMLElement) {
  const wrapper = el.createDiv({ cls: "chess-pgn-viewer" });
  const boardEl = document.createElement("chess-board") as any;
  boardEl.setAttribute("show-notation", "true");
  boardEl.style.width = "360px"; boardEl.style.maxWidth = "100%";
  wrapper.appendChild(boardEl);

  const controls = wrapper.createDiv({ cls: "chess-controls" });
  const prev = button(controls, "⟲"); const next = button(controls, "⟶");
  const reset = button(controls, "↻"); const play = button(controls, "▶/⏸");
  const flip = button(controls, "⤾");
  const movesEl = wrapper.createDiv({ cls: "chess-moves" });

  const game = new Chess(); game.loadPgn(pgn, { sloppy: true });
  const history = game.history({ verbose: true });
  let ply = 0, timer: number | null = null, flipped = false;

  function fenAt(p: number) {
    const g = new Chess(); g.loadPgn(pgn, { sloppy: true }); g.reset();
    for (let i = 0; i < p; i++) g.move(history[i]);
    return g.fen();
  }

  function render() {
    boardEl.setPosition(fenAt(ply), true);
    if (flipped) boardEl.setAttribute("orientation", (ply % 2 ? "black" : "white"));
    movesEl.textContent = history.map((m, i) => i === ply - 1 ? `[${m.san}]` : m.san).join(" ");
  }

  function step(d: number) { ply = Math.max(0, Math.min(history.length, ply + d)); render(); }
  function autoplay() {
    if (timer != null) { clearInterval(timer); timer = null; play.setText("▶"); return; }
    play.setText("⏸"); timer = window.setInterval(() => { if (ply >= history.length) return autoplay(); step(+1); }, 500);
  }

  prev.onclick = () => step(-1);
  next.onclick = () => step(+1);
  reset.onclick = () => { ply = 0; render(); };
  play.onclick = () => autoplay();
  flip.onclick = () => { flipped = !flipped; render(); };

  render();

  function button(parent: HTMLElement, text: string) {
    const b = parent.createEl("button", { text }); return b;
  }
}
```

### ui/ImportModal.ts
```ts
import { App, Modal, Setting } from "obsidian";
export class ImportModal extends Modal {
  constructor(app: App, private onSubmit: (pgn: string) => void) { super(app); }
  onOpen() {
    const { contentEl } = this; contentEl.empty();
    contentEl.createEl("h2", { text: "Import PGN" });
    const ta = contentEl.createEl("textarea", { attr: { rows: "18", spellcheck: "false" } });
    new Setting(contentEl)
      .addButton(b => b.setButtonText("Create Note").setCta().onClick(() => {
        const pgn = (ta.value || "").trim();
        if (!pgn) return; this.onSubmit(pgn); this.close();
      }))
      .addButton(b => b.setButtonText("Cancel").onClick(() => this.close()));
  }
}
```

### adapters/NoteRepo.ts
```ts
import { TFile, Vault } from "obsidian";
export async function upsert(vault: Vault, path: string, content: string) {
  const existing = vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) return vault.modify(existing, content);
  const dir = path.split("/").slice(0,-1).join("/");
  if (dir) await vault.createFolder(dir).catch(()=>{});
  return vault.create(path, content);
}
```

### util/sha1.ts
```ts
export async function sha1(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
```

---

## 7) Acceptance Criteria (V0)
- Ribbon button and default hotkey `Ctrl+Alt+P` open the import modal.
- Submitting valid PGN creates a note under `Chess/games/` with filename including player names and Elo where available.
- Frontmatter populated from PGN headers plus `created` and `hash`.
- Viewing the note renders an interactive board with basic controls; full PGN support via `chess.js`.
- Works offline; zero network calls at runtime.

---

## 8) References
- Obsidian sample plugin; Getting started docs.
- `chess.js` (BSD-2) and `chessboard-element` (MIT).
- PGN standard: Steven J. Edwards (Portable Game Notation Specification), plus background references.
