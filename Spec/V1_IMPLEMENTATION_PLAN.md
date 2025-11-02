# Implementation Plan: Chess Trainer V1 – Companion Stockfish Service

## Executive Summary

V1 delivers automated game analysis by orchestrating a native Stockfish engine that runs **outside** Obsidian. Instead of embedding the WASM build (blocked by Obsidian’s Web Worker limitations), we ship a lightweight companion service that the user runs locally. The plugin talks to this service over HTTP, turning engine analysis into a simple request/response workflow. A hosted variant (Vercel/Netlify) remains an option once the same API is proven locally.

**Target Release**: Post-V0 (foundation complete)  
**Core Value**: Automatic game analysis with move annotations, evaluation graphs, and analysis notes

**Status**: 🟡 In Progress – migrating from blocked WASM plan to companion-service architecture

**Dependencies**:
- V0 foundation (complete)
- User-installed Stockfish binary (for local companion)
- Optional: Node.js runtime to run the companion service script

---

## 0. Refactor & Cleanup

Before building the companion workflow, remove the dormant in-plugin engine artifacts.

- [ ] Delete bundles and helper files: `stockfish.wasm`, `stockfish.wasm.js`, `stockfish.worker.js`, `StockfishEngineSync.ts`, `testStockfishEngine.ts`, etc.
- [ ] Remove “Test Stockfish Engine” command and related wiring in `main.ts`.
- [ ] Revert custom esbuild loader for Stockfish assets.
- [ ] Drop the `stockfish.js` dependency from `package.json` / `package-lock.json`.
- [ ] Remove WASM-only docs (`STOCKFISH_TEST.md`, outdated specs) or archive them for posterity.
- [ ] Revert temporary TypeScript shims (e.g., `obsidian.d.ts`, `NoteRepo` tweaks) if they were only needed for the embedded engine.

_Outcome_: codebase is free from the blocked WASM approach and ready for the new architecture.

---

## 1. Companion Service (Local Stockfish Runner)

### Goals
- Wrap a native Stockfish executable in an HTTP API.
- Keep a single engine instance alive for multiple analysis requests.
- Mirror the same JSON contract the plugin will use for future cloud deployments.

### Deliverables
- `stockfish-service` project (Node.js reference implementation).  
- REST endpoints: `GET /health`, `POST /analyze`.
- Robust UCI loop handling (spawn, queue, graceful shutdown).
- README explaining installation (Stockfish binary, Node runtime) and usage.

### Tasks
1. **Project Setup**
   - Create repo/folder with TypeScript, Express (or Fastify), Zod for validation.
   - Add scripts: `npm run dev`, `npm run build`, `npm run start`.
2. **Engine Process Manager**
   - Implement `StockfishProcess` (spawn, send commands, read output, restart on crash).
   - Enforce mutex so only one analysis runs at a time (queue future requests).
3. **UCI Parser**
   - Parse `info` lines (depth, score, pv) and `bestmove` results.
   - Normalize evaluations (centipawn / mate) into a structured object.
4. **HTTP API**
   - `POST /analyze` accepts `{ fen?, moves?, depth?, multiPV?, movetimeMs? }`.
   - Validate payload, feed commands to engine, return JSON response.
   - Timeout handling (e.g., fail after 30s) with clear error messages.
5. **Health Endpoint**
   - `GET /health` checks that the engine process is alive; optionally return engine version.
6. **Configuration**
   - Support env vars: `STOCKFISH_PATH`, `PORT`, `ENGINE_THREADS`, `ENGINE_HASH`, etc.
7. **Testing**
   - Local integration tests hitting `/analyze` with sample FENs.
   - Ensure service recovers from engine restarts.

### Out of Scope
- Authentication / rate limiting (nice-to-have later).
- Persistence or caching (purely stateless for now).

---

## 2. Plugin Integration (Analysis Client Abstraction)

### Goals
- Replace direct engine calls with a client interface the plugin can swap (local companion now, remote service later).
- Provide user settings to enable/disable analysis, point to the companion service URL, and tweak analysis defaults.

### Deliverables
- `AnalysisClient` interface definition.
- `RemoteServiceAnalysisClient` implementation (HTTP fetch wrapper).
- Plugin settings UI additions.
- Import workflow updated to call the analysis client and persist results via `AnnotationStorage`.

### Tasks
1. **Interface & Types**
   - Define `AnalysisRequest`, `AnalysisOptions`, `AnalysisResult`, `PvLine`, etc. (reuse from `src/types/analysis.ts`).
   - Ensure the response matches the companion service JSON (best move, eval, PV lines, statistics, timing).
2. **Client Implementation**
   - `RemoteServiceAnalysisClient` with methods `analyze()` and `ping()`.
   - Configurable base URL (default `http://localhost:9898`).
   - Handle network errors, timeouts, and show notices to users.
3. **Settings UI**
   - Add toggle for “Enable analysis (requires companion service)”.
   - Input for service URL.
   - Defaults for depth, multiPV, movetime.
4. **Workflow Integration**
   - When importing a game, call `client.analyze` after note creation.
   - Store the analysis using `AnnotationStorage` (existing service).
   - Update note frontmatter/sections with link to analysis data.
5. **UI Feedback**
   - Display spinner / status message while analysis runs.
   - Notify user if companion is offline (with instructions to start it).
6. **Fallbacks**
   - Allow manual command (e.g., “Chess Trainer: Analyze current game”) when auto-analysis is disabled.

---

## 3. Optional: Hosted Service (Vercel/Netlify)

Once the local service is stable, we can deploy the same code to a serverless platform to offer a turn-key experience.

### Goals
- Provide a hosted URL for users who prefer not to run the companion locally.
- Evaluate performance/limits of free-tier serverless platforms (favor Vercel for generous execution time).

### Tasks (future)
1. Package the companion service as a serverless function (remove Node-only APIs).
2. Manage engine instantiation per request (or use a persistent KV/Durable Object if needed).
3. Add basic request queueing or graceful errors when hitting compute limits.
4. Document the trade-offs (requires internet, subject to quotas).

_This milestone is optional for V1 but should remain in the plan to keep architecture aligned._

---

## 4. Testing & Documentation

### Testing
- Manual end-to-end tests (import PGN → analysis → annotations appear).
- Companion service integration tests (cover typical FENs, multiPV, depth limits).
- Plugin unit tests/mocks for the analysis client.

### Documentation
- README updates:
  - “How to run the Stockfish companion service”.
  - Settings instructions for pointing the plugin to the service.
  - Troubleshooting (service offline, Stockfish binary missing, etc.).
- Spec updates: cross-reference `Spec/V1_WORKER_BLOCKER.md` (archived approach) and note the new solution.

---

## Architecture Overview

```
┌─────────────────────────┐       HTTP        ┌────────────────────────────┐
│ Obsidian Plugin         │ <----------------> │ Companion Service          │
│ - AnalysisClient        │                   │ - Express/Node server      │
│ - AnnotationStorage     │                   │ - StockfishProcess wrapper │
│ - UI feedback           │                   │ - Local Stockfish binary   │
└─────────────────────────┘                   └────────────────────────────┘
```

1. Plugin collects FEN/moves from the imported game.
2. Sends `POST /analyze` request.
3. Service runs Stockfish, parses output, returns JSON.
4. Plugin writes annotations and displays results.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Companion service not running | Analysis requests fail | Detect via `ping()` and show instructions to start service |
| Stockfish binary unavailable | Service startup fails | Document installation steps, allow custom `STOCKFISH_PATH` |
| Long-running analysis hits timeouts | Incomplete results | Limit default depth, expose movetime option, surface warnings |
| Users uncomfortable running local server | Adoption barrier | Provide hosted option (Milestone 3) |
| Plugin build still references old WASM files | Confusion / bundle bloat | Complete cleanup in Task 0 |

---

## Timeline (High-Level Estimate)

- **Week 0**: Task 0 cleanup.
- **Week 1**: Companion service implementation (Milestone 1).
- **Week 2**: Plugin analysis client + settings (Milestone 2).
- **Week 3**: Integration testing, documentation updates (Milestone 4).
- **Week 4** (optional): Hosted service prototype (Milestone 3).

Total ~3 weeks for local solution, +1 week for hosted option.

---

## Success Criteria

1. ✅ Companion service runs Stockfish locally and responds via HTTP.
2. ✅ Plugin can analyze a game end-to-end (annotations stored, UI reflects results).
3. ✅ Error handling guides users when the service is offline or misconfigured.
4. ✅ Documentation clearly explains setup and limitations.
5. ✅ (Optional) Hosted endpoint available for users who prefer the cloud option.

---

## References

- `Spec/V1_WORKER_BLOCKER.md` – Archived WASM approach.
- `Spec/ROADMAP.md` – Version overview and dependencies.
- `Spec/DesignTechDebt.md` – Follow-up enhancements once V1 ships.

---

## Implementation Notes & Checklists (for execution)

### Companion Service Details
- **Stockfish binary**: tested with Stockfish 16 (64-bit). Default executable name: `stockfish`. Allow override via `STOCKFISH_PATH`.
- **Project layout** (`stockfish-service/`):
  ```
  package.json
  tsconfig.json
  src/
    index.ts              // Express setup
    engine/StockfishProcess.ts
    engine/UciParser.ts
    routes/analyze.ts
    routes/health.ts
    types.ts
  README.md               // setup instructions
  ```
- **Dependencies**: `express`, `zod`, `async-mutex`, `pino` (optional logging).
- **/analyze request JSON**:
  ```json
  {
    "fen": "optional FEN, defaults to startpos",
    "moves": ["optional SAN or UCI moves"],
    "depth": 14,
    "multiPV": 1,
    "movetimeMs": 0
  }
  ```
- **Response JSON**:
  ```json
  {
    "bestMove": "e2e4",
    "ponder": "e7e5",
    "evaluation": { "type": "cp", "value": 23 },
    "lines": [
      {
        "pv": ["e2e4", "e7e5", "Nf3"],
        "eval": { "type": "cp", "value": 23 }
      }
    ],
    "statistics": { "depth": 14, "selDepth": 22, "nodes": 123456, "nps": 500000 },
    "timingMs": 512
  }
  ```
- **Timeout**: return 504 after 30 seconds; message "Analysis exceeded time limit (depth=%depth).".
- **Logging**: log request summary and errors to stdout (`pino` or console).
- **Shutdown**: handle SIGINT/SIGTERM to send `quit` to the engine.

### Plugin Integration Details
- **AnalysisClient files**:
  - `src/services/analysis/AnalysisClient.ts` (interface)
  - `src/services/analysis/RemoteServiceAnalysisClient.ts`
- **Settings defaults**:
  - `analysisEnabled`: false
  - `serviceUrl`: `http://localhost:9898`
  - `defaultDepth`: 14
  - `defaultMultiPV`: 1
  - `defaultMovetimeMs`: 0
- **UI strings**:
  - Toast when offline: "Stockfish companion service not reachable. Start the service or update the URL in settings."
  - Status during analysis: "Analyzing game with Stockfish..."
- **Annotation storage**: reuse `src/services/analysis/AnnotationStorage.ts`; store `analysisFile` path in game frontmatter.
- **Commands**: add "Chess Trainer: Analyze current game" (manual trigger).

### Cleanup Checklist (Task 0)
- Remove files: `src/services/engine/StockfishEngineSync.ts`, `src/services/engine/testStockfish.ts`, `stockfish.wasm`, `stockfish.wasm.js`, `stockfish.worker.js`, `STOCKFISH_TEST.md`.
- Remove "Test Stockfish Engine" command from `main.ts`.
- Revert esbuild plugin snippet that inlined Stockfish assets.
- Run `npm uninstall stockfish.js` and clean `package-lock.json`.
- Delete TypeScript shims added only for WASM (check `src/types/obsidian.d.ts`, `src/adapters/NoteRepo.ts`).

### Testing Scenarios
- Local service running, plugin imports short PGN (depth 12) → annotations appear, timing logged.
- Companion service offline → plugin shows toast, no crash.
- `multiPV = 3` → response includes 3 PV lines, plugin stores them.
- Long game (100+ moves) → ensure service handles queues, plugin displays progress.

### README Updates
- Add “Stockfish Companion Service” section with steps:
  1. Install Stockfish (link to official downloads).
  2. Install Node.js.
  3. Clone/run `stockfish-service` (`npm install`, `npm run start`).
  4. Configure plugin settings (URL, depth).
  5. Trigger analysis command.
- Mark old embedded-engine instructions as archived.

### Optional Hosted Service Notes
- Vercel deployment: `api/analyze.ts`, `api/health.ts`; ensure WASM artefact < 50MB zipped.
- Add environment variables for API secrets if needed.
- Document free-tier limits (10s execution, 125MB memory).
