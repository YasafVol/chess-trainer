# Epic: Chess Trainer V0 – Manual PGN → Interactive Note

Source spec: `Spec/obsidian-chess-trainer-V0-note.md` (v0.2.0).

## Objective
Deliver a production-ready Obsidian plugin that:
- Accepts pasted PGNs via command/hotkey or ribbon button.
- Generates a canonical note under `Chess/games/` with strict frontmatter, fenced ```chess-pgn``` block, and original PGN retained.
- Renders an embedded board + move list using bundled `chess.js` + `chessboard-element` with offline playback controls.

Target release window: 3 weeks from kickoff.

## Milestones, Deliverables, and Tasks

### Milestone 1 – Foundation & Intake (Days 1‑5)
**Exit criteria:** core project structure, dependencies, and intake plumbing exist; manual PGNs can be validated but not yet saved.

Tasks:
1. **Repo scaffolding**
   - [ ] Recreate `src/{deps,services,ui,adapters,util}` and update `tsconfig.json`, `esbuild.config.mjs`, `package.json` imports.
   - [ ] Vendor `chess.js` (ESM build) and `chessboard-element` under `src/deps/` and ensure esbuild bundles them.
2. **Command surface**
   - [ ] Add ribbon icon + command + default hotkey (`Ctrl+Alt+P` / `Ctrl+Opt+P`).
   - [ ] Stub `ImportModal` with textarea + disabled submit button until validation passes.
3. **Validation utilities**
   - [ ] Create `services/pgnValidator.ts` using `chess.js` to detect malformed PGNs (empty input, missing headers/moves, parse failures).
   - [ ] Implement `util/sha1.ts` and `util/filename.ts` for deterministic hashing/naming.
4. **Telemetry/logging hooks**
   - [ ] Add lightweight logging helper to centralize Notices + console output for debugging invalid PGNs.

### Milestone 2 – Note Generation & Storage (Days 6‑12)
**Exit criteria:** Submitting valid PGN writes a fully-formed note with correct frontmatter, filename, and fenced block. Re-importing same PGN overwrites content idempotently.

Tasks:
1. **Import Modal UX polish**
   - [ ] Finalize modal layout (header, textarea, helper text, CTA + cancel).
   - [ ] Prevent submission when validation fails; show inline error copy from validator.
2. **CreateNoteFromPGN service**
   - [ ] Parse headers via `chess.js`, map to schema, normalize dates/Elo, compute SHA-1.
   - [ ] Generate markdown body with frontmatter + ```chess-pgn``` block preserving original PGN.
3. **Vault adapter**
   - [ ] Implement `adapters/NoteRepo.upsert` with recursive folder creation for `Chess/games/`.
   - [ ] Add unit tests for new-file creation, existing-note overwrite, and collision handling.
4. **Automation**
   - [ ] Write Jest/obsidian-test harness (or Bun test once introduced) to cover frontmatter and filename generation.
   - [ ] Add sample PGNs under `Spec/samples/` for regression use.

### Milestone 3 – Renderer, QA, and Packaging (Days 13‑21)
**Exit criteria:** Note preview renders playable board + move list; plugin passes manual QA and build artifacts are ready for release.

Tasks:
1. **Markdown processor**
   - [ ] Register `chess-pgn` processor that lazy-loads renderer component.
   - [ ] Guard against excessively long PGNs (limit e.g., 500 moves) with warning.
2. **Renderer implementation**
   - [ ] Build `ui/Renderer.ts` that orchestrates `chess.js` game state, `<chess-board>` positioning, move list highlighting, autoplay (500 ms ply), reset/flip controls, and orientation sync.
   - [ ] Ensure autoplay pauses when note is hidden or disposed (`this.registerDomEvent` or mutation observer).
   - [ ] Style components via `styles.css` with responsive layout and accessible button labels/tooltips.
3. **QA & release prep**
   - [ ] Manual verification on Windows/macOS (desktop) and at least one mobile device.
   - [ ] Confirm no runtime network requests (DevTools audit).
   - [ ] Update README with install/use instructions, dependencies, and acknowledgements.
   - [ ] Run `npm run build`; attach generated `main.js`, `manifest.json`, `styles.css` to release bundle folder for submission.

## Task Tracker

| ID | Task | Owner | Status | Notes / Blockers |
| --- | --- | --- | --- | --- |
| FDN-01 | Scaffolding + vendored deps | TBD | ☐ | Ensure esbuild external list excludes bundled libs. |
| INT-02 | Import command + hotkey wiring | TBD | ☐ | Requires icon selection (dice placeholder acceptable). |
| VAL-03 | PGN validator + messaging | TBD | ☐ | Validate both headers + moves; use Notices for errors. |
| NOTE-04 | CreateNoteFromPGN service | TBD | ☐ | Handles frontmatter, body, SHA-1, folder creation. |
| NOTE-05 | Regression tests for filenames/frontmatter | TBD | ☐ | Use snapshot tests with sample PGNs. |
| UI-06 | Import modal UX polish | TBD | ☐ | Provide copy + error states. |
| RND-07 | `chess-pgn` renderer + controls | TBD | ☐ | Bundled `chess.js`, ensure autoplay toggle works. |
| QA-08 | Manual QA + packaging | TBD | ☐ | Includes README update + release artifact prep. |

(Mark status as ☑ when complete; add owner initials as assigned.)

## Dependencies & Risks
- **Vendored libraries:** Need minified `chess.js` + `chessboard-element`; verify combined size <3 MB to keep plugin lean.
- **Crypto availability:** Web Crypto API (for SHA-1) must work in Obsidian desktop + mobile; otherwise include fallback hashing library.
- **Autoplay performance:** Large PGNs could cause UI lag; consider throttling or chunked state updates.
- **Internationalization:** Filenames must sanitize non-ASCII; ensure fallback when player names contain forbidden characters.

## Definition of Done
1. Command, hotkey, and ribbon entry exist; valid PGN submission produces a note under `Chess/games/` with file naming and frontmatter per spec §2.
2. Note preview renders interactive board with prev/next/reset/play/flip controls, synchronized move list, and autoplay that pauses appropriately.
3. All dependencies bundled locally, `npm run build` succeeds, README documents install/usage, and manual QA confirms offline behavior across supported platforms.

## Detailed Implementation Considerations

### Project Setup & Architecture
1. **Directory order**: create `src/` → `src/deps` (vendor libs) → `src/util` (`sha1.ts`, `filename.ts`, `logger.ts`) → `src/services` → `src/adapters` → `src/ui` → wire `src/main.ts`.
2. **Vendor steps**: download ESM `chess.js` and `chessboard-element` into `src/deps`, document versions, ensure TypeScript includes them, and import via relative paths.
3. **esbuild config**: bundle entry `src/main.ts`, remove libs from `external`, alias to vendored files, enable sourcemaps in dev, minify in prod, emit metafile for size analysis.
4. **Manifest/package updates**: bump version to `0.2.0`, refresh description, ensure author/minAppVersion correct, align package.json version/scripts (`build`, `test`, `analyze`).

### Development Sequence
5. **File priority**: utilities → validator → note service → adapter → modal → main → renderer.
6. **Integration checkpoints**: unit-test utilities, integration-test CreateNote + NoteRepo, manual test import modal, final test renderer in Obsidian preview.
7. **Validation strategy**: handle empty input, missing headers, non-SAN tokens, multiple games, oversized PGNs (>1 MB); return structured error array for UI.
8. **Bundle monitoring**: add `npm run analyze` to inspect esbuild metafile, record bundle size per commit, keep gzipped output <300 KB.

### Technical Implementation
9. **Web Crypto fallback**: feature-detect `crypto.subtle`; fallback to vendored SHA-1 (e.g., `js-sha1`) when unavailable.
10. **Mobile compatibility**: responsive board width, large tap targets, avoid hover-only controls, pause autoplay on layout changes.
11. **Performance throttling**: precompute FEN list once, limit autoplay for PGNs >500 plies, allow manual stepping when throttled.
12. **State management**: encapsulate renderer in disposable class, store timers/listeners, expose `dispose()` and register cleanup via Obsidian processor teardown.

### Testing & Quality
13. **Test data**: include Chess.com PGN, Lichess PGN lacking Elo, manual PGN with comments, malformed PGN for negative tests.
14. **Cross-platform**: verify Windows + macOS desktop and at least one mobile platform; confirm hotkeys and rendering parity.
15. **Regression tests**: snapshot filename/frontmatter outputs with Jest/Bun; run in CI via `npm run test`.
16. **Edge cases**: test missing headers, duplicate hashes, PGNs with `{}` comments, result `*`, non-UTF8 characters.

### Release & Deployment
17. **Build verification**: run `npm run build`, ensure artifacts exist, smoke-test in vault, confirm manifest version/id.
18. **README updates**: add install instructions, usage walkthrough, dependency acknowledgements, roadmap, troubleshooting.
19. **Version management**: sync `package.json`, `manifest.json`, `versions.json`; tag release `0.2.0`; publish artifacts.
20. **Performance metrics**: track bundle size, note creation latency (<1 s typical), renderer memory (<50 MB), autoplay CPU (<20%).

### Risk Mitigation
21. **Dependency updates**: lock vendored versions, document source, schedule periodic refresh.
22. **Obsidian API changes**: rely on documented APIs only, monitor release notes, test against latest insider build.
23. **User recovery**: keep modal open on failure, show inline errors, detect duplicate hashes and offer to open existing note.
24. **Accessibility**: add aria-labels, focus states, keyboard shortcuts for controls, announce current move via ARIA live region.
