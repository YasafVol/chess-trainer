# Module: Chess Trainer Plugin

## Scope
Obsidian plugin runtime under repo root and `src/`.

## Layer Placement
- Contracts:
  - `src/types/settings.ts`
  - `src/types/analysis.ts`
- Domain:
  - `src/services/pgnValidator.ts`
  - `src/util/pgn.ts`
  - `src/util/filename.ts`
  - `src/util/sha1.ts`
  - `src/util/eco.ts`
- Application:
  - `main.ts` import and analysis orchestration methods
- Adapters:
  - `src/adapters/NoteRepo.ts`
  - `src/services/analysis/RemoteServiceAnalysisClient.ts`
  - `src/services/analysis/AnnotationStorage.ts`
- Presentation:
  - `src/ui/ImportModal.ts`
  - `src/ui/SettingsTab.ts`
  - `src/ui/PromotionModal.ts`
  - viewer rendering sections in `main.ts`
- Composition:
  - plugin lifecycle, command/ribbon/processor registration in `main.ts`

## Notes
- Current compromise: `main.ts` spans all layers.
- Refactor target: move orchestration and rendering into separate application/presentation modules.
