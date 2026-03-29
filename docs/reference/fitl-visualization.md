# FITL Visualization Source Rules

## Purpose

Define how the backoffice FITL explorer builds its graph so maintainers can trust what is shown, understand the v2 focus-depth behavior, and know where to update it.

## Source precedence

1. Vertical FITL docs under `docs/architecture/verticals/`
2. Layer docs under `docs/architecture/layers/`
3. Module docs under `docs/modules/`
4. `docs/architecture/LAYER_X_FEATURE_MATRIX.md`
5. Decisions and issue docs under `docs/decisions/`
6. `apps/web/fitl-tooling.manifest.json` for external, runtime, deferred, build, and deploy tooling that is not encoded cleanly in FITL markdown alone

## Curation rules

- Intent and feature nodes come from vertical docs, not route inspection.
- File-level implementation references come only from curated FITL docs, module maps, and the layer-feature matrix.
- The explorer must not infer arbitrary dependency edges from source imports in v1.
- Tooling manifest entries should exist only for tools that materially affect runtime, persistence, deployment, or future deferred architecture.
- Tooling entries must declare lifecycle as `active`, `deferred`, `build`, or `deploy`.
- Tooling entries must declare system as `internal`, `external`, or `browser-platform`.
- Active runtime surfaces such as `Convex/Auth` must be modeled as active tooling, while genuinely deferred surfaces remain hidden by default unless explicitly included.
- Deploy-only surfaces such as Vercel must be modeled as deployment concerns, not runtime dependencies.

## Generated artifact

- `apps/web/scripts/generate-fitl-graph.mjs` builds the explorer snapshot.
- `apps/web/src/generated/fitlGraphSnapshot.ts` is the generated app-consumable artifact.
- `apps/web/src/generated/fitlGraphSnapshot.json` is emitted alongside the TypeScript module for inspection and debugging.

## Interaction model

- Canonical route state is `focus`, `depth`, `q`, and `includeDeferred`.
- The landing view is project summary: project node plus intents and verticals only.
- `architecture` depth reveals context for the current focus, especially layers and tools.
- `implementation` depth is only meaningful for a focused vertical or tool and should expose modules, files, and test gates for that focused neighborhood only.
- Search is route-backed and should lead users to a focusable entry point instead of globally filtering the graph into a hairball.
- The dossier is the primary reading surface; the graph is the primary relationship surface.

## Maintenance trigger

Update the explorer sources whenever a non-trivial FITL change alters:

- a vertical intent or impacted-layer list
- a module-to-layer mapping
- a file mapping in the layer-feature matrix
- a deferred/runtime/deploy tooling boundary
- a decision or known issue that materially changes planning context
