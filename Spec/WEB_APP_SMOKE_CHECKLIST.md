# Web app smoke checklist

Last updated: 2026-02-28

## Scope

Manual smoke checks for the TanStack web app (`apps/web`) covering:
- PGN import flow
- Game replay and board controls
- Stockfish worker initialization
- Per-ply analysis (run/cancel/resume)
- Long-game guardrails and retry behavior

## Preconditions

1. Install deps once at repo root and in `apps/web` if needed.
2. Start web app:
   - `cd apps/web`
   - `npm run dev`
3. Test in Chrome (desktop) and one mobile viewport/device.

## Checklist

1. Route load and basic nav
   - Open `/`.
   - Confirm home renders and navigation links work.
   - Navigate to import page and back without console errors.

2. PGN import success path
   - Paste a valid PGN with headers and moves.
   - Submit import.
   - Confirm redirect to `/game/:id`.
   - Confirm player names, hash, and move list render.

3. PGN import failure path
   - Paste invalid PGN text.
   - Confirm validation error appears and app does not crash.

4. Board replay controls
   - On game page, click `Prev`, `Next`, `Reset`, `Play`, `Pause`, `Flip`.
   - Use keyboard: `ArrowLeft`, `ArrowRight`, `Home`, `Space`, `f`.
   - Confirm board and current move stay in sync.

5. Manual board moves from current position
   - Drag a legal move on the board.
   - Confirm position updates and `Back to line` appears.
   - Drag an illegal move.
   - Confirm piece snaps back.
   - Click `Back to line` and confirm replay position is restored.

6. Engine initialization
   - Refresh game page.
   - Confirm `Analyze game` becomes enabled after engine init.
   - Verify chosen flavor behavior:
     - Mobile user agent => `stockfish-18-lite-single`
     - Non-isolated desktop => `stockfish-18-single`
     - `crossOriginIsolated` desktop => `stockfish-18`

7. Analysis run (happy path)
   - Click `Analyze game`.
   - Confirm progress indicator updates.
   - Confirm per-ply eval appears near move list.
   - Confirm latest run status becomes `completed` when finished.

8. Analysis cancel path
   - Start analysis and click `Cancel analysis`.
   - Confirm status transitions to cancelled and no crash occurs.
   - Confirm running indicator clears.

9. Visibility-change cancel guardrail
   - Start analysis.
   - Move tab to background.
   - Confirm analysis is cancelled cleanly.

10. Long-game guardrails
   - Import a long game (>200 plies).
   - Confirm plan is sampled (not every ply at full depth).
   - Confirm budget stop behavior if foreground runtime exceeds configured budget.
   - Re-run analysis and confirm continuation/refinement works.

11. Retry behavior
   - Simulate transient engine delay/error (throttle CPU or force busy tab).
   - Confirm one retry occurs with reduced depth.
   - Confirm run completes or fails with explicit error text, never hangs.

12. Persistence check
   - Reload `/game/:id` after analysis.
   - Confirm latest run summary and stored per-ply results reload from browser storage.

## Exit criteria

1. No uncaught runtime errors during the checklist.
2. Analyze flow never hangs indefinitely (timeouts + retries work).
3. Cancel behavior is deterministic (user cancel + visibility cancel).
4. Stored runs and per-ply analysis reload correctly after refresh.
