# Layer x Feature Matrix

Legend:
- `P`: primary ownership
- `S`: supporting ownership
- `-`: not materially involved

| Feature / Use-case | Contracts | Domain | Application | Adapters | Presentation | Composition |
| --- | --- | --- | --- | --- | --- | --- |
| Import PGN and validate | P | P | S | S | P | S |
| Persist game records | S | S | P | P | S | S |
| Replay, controls, manual moves | S | P | P | P | P | S |
| Run engine analysis | P | P | P | P | S | S |
| Persist and reload analysis results | P | S | P | P | S | S |
| Browse library and open game | S | S | P | P | P | S |
| Generate and review puzzles | P | P | P | P | P | S |
| App startup wiring | - | - | S | S | S | P |

## Feature mapping to implementation

### Import PGN and validate
- Contracts:
  - `packages/chess-core/src/pgn.ts`
  - `packages/chess-core/src/headers.ts`
  - `apps/web/src/domain/types.ts`
- Domain:
  - `packages/chess-core/src/hash.ts`
  - `apps/web/src/domain/gameReplay.ts`
- Application:
  - `apps/web/src/routes/import.tsx`
- Adapters:
  - `apps/web/src/lib/storage/repositories/gamesRepo.ts`
  - `apps/web/src/lib/mockData.ts`
- Presentation:
  - `apps/web/src/routes/import.tsx`
- Composition:
  - `apps/web/src/router.tsx`

### Replay, controls, and manual move flow
- Contracts:
  - `apps/web/src/board/BoardAdapter.ts`
  - `apps/web/src/domain/types.ts`
- Domain:
  - `apps/web/src/domain/gameReplay.ts`
- Application:
  - `apps/web/src/routes/game.tsx`
- Adapters:
  - `apps/web/src/board/ChessboardElementAdapter.ts`
- Presentation:
  - `apps/web/src/routes/game.tsx`
  - `apps/web/src/styles.css` (eval bar, eval graph SVG, board host sizing)
  - `apps/web/src/components/ui/*.tsx` (Button, Card, Badge)
- Composition:
  - `apps/web/src/router.tsx`

### Engine analysis and annotations
- Contracts:
  - `apps/web/src/domain/types.ts`
  - `apps/web/src/engine/engineClient.ts`
- Domain:
  - `apps/web/src/domain/analysisPolicy.ts`
  - `apps/web/src/domain/analysisPlan.ts`
  - `apps/web/src/domain/analysisRunLifecycle.ts`
- Application:
  - `apps/web/src/application/runGameAnalysis.ts`
  - `apps/web/src/routes/game.tsx`
- Adapters:
  - `apps/web/src/engine/engineClient.ts`
  - `apps/web/src/engine/engine.worker.ts`
  - `apps/web/src/lib/storage/repositories/analysisRepo.ts`
- Presentation:
  - `apps/web/src/routes/game.tsx`
- Composition:
  - `apps/web/src/main.tsx`

### Library and game lifecycle
- Contracts:
  - `apps/web/src/domain/types.ts`
- Domain:
  - `apps/web/src/domain/gameReplay.ts`
- Application:
  - `apps/web/src/routes/library.tsx`
  - `apps/web/src/routes/game.tsx`
- Adapters:
  - `apps/web/src/lib/storage/repositories/gamesRepo.ts`
  - `apps/web/src/lib/storage/db.ts`
  - `apps/web/src/lib/storage/migrations.ts`
- Presentation:
  - `apps/web/src/routes/library.tsx`
- Composition:
  - `apps/web/src/main.tsx`
  - `apps/web/src/router.tsx`

### Puzzle generation and review
- Contracts:
  - `apps/web/src/domain/types.ts`
- Domain:
  - `apps/web/src/domain/puzzles.ts`
- Application:
  - `apps/web/src/routes/puzzles.tsx`
  - `apps/web/src/routes/puzzle.tsx`
- Adapters:
  - `apps/web/src/lib/storage/repositories/puzzlesRepo.ts`
  - `apps/web/src/lib/mockData.ts`
- Presentation:
  - `apps/web/src/routes/puzzles.tsx`
  - `apps/web/src/routes/puzzle.tsx`
- Composition:
  - `apps/web/src/router.tsx`

## Current boundary violations and debt

- `apps/web/src/routes/import.tsx`, `apps/web/src/routes/game.tsx`, `apps/web/src/routes/library.tsx`, and `apps/web/src/routes/puzzle.tsx` still contain application orchestration.
- UI-level smoke coverage exists, but route-level automated tests are still missing.
