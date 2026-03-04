# Layer x Feature Matrix

Legend:
- `P`: primary ownership
- `S`: supporting ownership
- `-`: not materially involved

| Feature / Use-case | Contracts | Domain | Application | Adapters | Presentation | Composition |
| --- | --- | --- | --- | --- | --- | --- |
| Import PGN and validate | P | P | S | S | P | S |
| Persist game record/note | S | S | P | P | S | S |
| Replay, controls, manual moves | S | P | P | P | P | S |
| Run engine analysis | P | P | P | P | S | S |
| Persist/reload analysis results | P | S | P | P | S | S |
| Browse library and open game | S | S | P | P | P | S |
| App/plugin startup wiring | - | - | S | S | S | P |

## Feature mapping to implementation

### Import PGN and validate
- Contracts:
  - `packages/chess-core/src/pgn.ts`
  - `packages/chess-core/src/headers.ts`
  - `src/services/pgnValidator.ts` result types
- Domain:
  - `packages/chess-core/src/hash.ts`
  - `src/util/filename.ts`
- Application:
  - `main.ts` `processPgnImport()`
  - `apps/web/src/routes/import.tsx` submit flow
- Adapters:
  - `src/adapters/NoteRepo.ts`
  - `apps/web/src/lib/storage/repositories/gamesRepo.ts`
- Presentation:
  - `src/ui/ImportModal.ts`
  - `apps/web/src/routes/import.tsx`
- Composition:
  - `main.ts` command+ribbon registration
  - `apps/web/src/router.tsx`

### Replay, controls, and manual move flow
- Contracts:
  - `apps/web/src/board/BoardAdapter.ts`
  - `apps/web/src/domain/types.ts`
- Domain:
  - `apps/web/src/domain/gameReplay.ts`
- Application:
  - `apps/web/src/routes/game.tsx` replay orchestration
  - `main.ts` render state progression
- Adapters:
  - `apps/web/src/board/ChessboardElementAdapter.ts`
- Presentation:
  - `apps/web/src/routes/game.tsx`
  - `styles.css`
- Composition:
  - Plugin markdown processor registration in `main.ts`
  - Web route binding in `apps/web/src/router.tsx`

### Engine analysis and annotations
- Contracts:
  - `src/types/analysis.ts`
  - `stockfish-service/src/types.ts`
  - `apps/web/src/domain/types.ts` (`AnalysisRun`, `PlyAnalysis`)
- Domain:
  - `apps/web/src/domain/analysisPolicy.ts`
  - `apps/web/src/domain/analysisPlan.ts`
  - `stockfish-service/src/engine/UciParser.ts`
- Application:
  - `main.ts` `analyzeGameAsync()` / `analyzeCurrentGame()`
  - `apps/web/src/routes/game.tsx` `runAnalysis()`
- Adapters:
  - `src/services/analysis/RemoteServiceAnalysisClient.ts`
  - `src/services/analysis/AnnotationStorage.ts`
  - `apps/web/src/engine/engineClient.ts`
  - `apps/web/src/engine/engine.worker.ts`
  - `stockfish-service/src/engine/StockfishProcess.ts`
  - `apps/web/src/lib/storage/repositories/analysisRepo.ts`
- Presentation:
  - Plugin analysis panel in `main.ts`
  - Web analysis controls in `apps/web/src/routes/game.tsx`
- Composition:
  - Plugin settings/bootstrap in `main.ts` and `src/ui/SettingsTab.ts`
  - Service process startup in `stockfish-service/src/index.ts`

### Library and game lifecycle
- Contracts:
  - `apps/web/src/domain/types.ts`
- Domain:
  - `apps/web/src/domain/gameReplay.ts` (game-level read model prep)
- Application:
  - `apps/web/src/routes/library.tsx` load lifecycle
  - `apps/web/src/routes/game.tsx` refresh lifecycle
- Adapters:
  - `apps/web/src/lib/storage/repositories/gamesRepo.ts`
  - `apps/web/src/lib/storage/db.ts`
  - `apps/web/src/lib/storage/migrations.ts`
- Presentation:
  - `apps/web/src/routes/library.tsx`
- Composition:
  - `apps/web/src/main.tsx`
  - `apps/web/src/router.tsx`

## Current boundary violations and debt
- `main.ts` in plugin currently mixes all six layers; this is intentional debt until decomposition.
- `apps/web/src/routes/game.tsx` contains both application orchestration and presentation logic; extract use-case service next.
- Companion service routes include application concerns directly; move orchestration to a dedicated application module when test coverage is added.
