# Documentation Index

This repository uses FITL Nav as the canonical documentation structure. Read docs in this order:

1. Governance and architectural rules
2. Vertical intent docs
3. Module maps
4. Decisions and open risks
5. Quality and reference material
6. Product plans in `Spec/`

## FITL Nav governance and architecture
- `../AGENTS.md`
- `architecture/LAYERED_BUILD_PLAN.md`
- `architecture/LAYER_X_FEATURE_MATRIX.md`
- `architecture/layers/README.md`
- `architecture/layers/contracts.md`
- `architecture/layers/domain.md`
- `architecture/layers/application.md`
- `architecture/layers/adapters.md`
- `architecture/layers/presentation.md`
- `architecture/layers/composition.md`

## Vertical intent docs
- `architecture/verticals/v1-import-and-persist-pgn.md`
- `architecture/verticals/v2-replay-and-navigation.md`
- `architecture/verticals/v3-engine-analysis-and-annotations.md`
- `architecture/verticals/v4-library-and-game-lifecycle.md`
- `architecture/verticals/v5-puzzle-generation-and-review.md`
- `architecture/verticals/v6-game-view-and-analysis-workbench.md`
- `architecture/verticals/v7-backoffice-and-benchmarking.md`

## Module map
- `modules/README.md`
- `modules/web-app.md`
- `modules/chess-core-package.md`

## Decisions and risk
- `decisions/DECISION_PROFILE_2026-03-03.md`
- `decisions/OPEN_ISSUES_AND_COMPROMISES.md`
- `decisions/known-issues.md`

## Quality and operational docs
- `quality/README.md`
- `quality/performance-baselines.md`
- `quality/testing-guide.md`

## Reference docs
- `reference/README.md`
- `reference/stockfish-analysis-capabilities.md`
- `reference/fitl-visualization.md`

## Product plans and transition specs
- `../Spec/ROADMAP.md`
- `../Spec/WEB_APP_TRANSITION_PLAN.md`
- `../Spec/WEB_APP_BACKLOG.md`
- `../Spec/WEB_APP_SMOKE_CHECKLIST.md`
- `../Spec/adr/README.md`

## Notes
- Root-level operational docs were consolidated into `docs/quality/`, `docs/reference/`, and `docs/decisions/`.
- The active runtime is the standalone TanStack Router web app under `apps/web`.
- Convex/auth files are part of the active authenticated runtime path, with IndexedDB retained as a read cache and benchmark-only local store.
