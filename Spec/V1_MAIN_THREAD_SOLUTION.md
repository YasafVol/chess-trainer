# Stockfish Main-Thread Solution (Archived)

This document captured an intermediate idea—running the Stockfish WASM engine on the main thread during import. After further experimentation, the approach was abandoned in favor of the companion-service architecture described in `Spec/V1_IMPLEMENTATION_PLAN.md`.

## Why it’s archived
- Main-thread execution would freeze Obsidian for the duration of each analysis.
- The solution still required bundling a large WASM file and dealing with Electron’s fetch restrictions.
- It did not address the broader maintainability issues that the companion service solves.

## Current strategy
- Use a lightweight local service (or hosted API) to run Stockfish outside Obsidian.
- See:
  - `Spec/V1_IMPLEMENTATION_PLAN.md` for the active plan.
  - `Spec/V1_WORKER_BLOCKER.md` for the historical Worker limitation.

This file remains only for historical context.
