# V2: Replay and Navigation

## Business/User Intent

Help users study a game move-by-move with reliable board state, move history, autoplay, orientation control, and manual what-if interaction.

## Impacted Layers

- Contracts: replay move and board-drop contracts
- Domain: replay model derivation and move conversion logic
- Application: current-ply, autoplay, and manual-branch state
- Adapters: board component adapter wiring
- Presentation: controls, move list, and board display
- Composition: route mounting and cleanup

## Tests and Acceptance Criteria

- Prev/Next/Reset/Play/Pause/Flip keep board and move list synchronized
- Illegal manual moves snap back
- Manual branch can return to the canonical line
- Web smoke replay section passes
