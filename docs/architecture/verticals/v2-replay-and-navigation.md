# V2: Replay and Navigation

## Business/User Intent
Help users study a game move-by-move with reliable board state, readable move history, autoplay, orientation control, and manual what-if interaction.

## Flow Narrative
1. User opens a persisted game.
2. System builds replay model (move list + FEN positions).
3. Board renders initial state and controls are enabled.
4. User navigates with buttons/keyboard/autoplay.
5. Optional manual move branch is allowed and can return to canonical line.

## Impacted Layers
- Contracts: replay move and board-drop interface contracts.
- Domain: replay model derivation and move conversion logic.
- Application: current-ply, autoplay, manual branch state machine.
- Adapters: board component adapter wiring.
- Presentation: controls, move list, and board display.
- Composition: processor/route mounting and cleanup.

## Execution Order Per Layer
1. Tests (Red): failing replay timeline and navigation behavior tests.
2. Contracts: lock `ReplayMove`, board-drop event shape.
3. Domain: implement deterministic replay data generation.
4. Application: implement ply transitions, manual branch reset, autoplay boundaries.
5. Adapters: implement `BoardAdapter` and concrete board integration.
6. Presentation: wire controls, keybindings, active move styling.
7. Composition: mount/unmount lifecycle and cleanup registration.
8. Tests (Green): replay and keyboard/manual path checks pass.
9. Refactor: extract replay controller from route/plugin render function.
10. Docs updates: matrix/layer/module/decision sync.

## Tests and Acceptance Criteria
- Acceptance criteria:
  - Prev/Next/Reset/Play/Pause/Flip keep board and move list synchronized.
  - Illegal manual moves snap back.
  - Manual branch can return to canonical line.
- Tests/gates:
  - Add unit tests for `buildReplayData` edge cases.
  - Run web smoke checklist replay section.
  - Plugin manual QA renderer section.

## Risk/Deferment References
- `BUGS.md`:
  - chessboard drag/drop race condition (deferred)
  - move pane focus/scroll issue (deferred)
- `Spec/WEB_APP_BACKLOG.md` tickets: `WEB-102`, `WEB-103`, `WEB-104`, `WEB-105`.
