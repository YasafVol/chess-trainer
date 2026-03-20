# FITL Nav Layered Build Plan

## Resolved inputs

- Repo root: `{{REPO_ROOT}}`
- Main runtime stack: `{{STACK}}`
- Current project objective: `{{OBJECTIVE}}`
- Required quality bar: `{{QUALITY_BAR}}`
- Deferred scope baseline: `{{DEFERRED_ITEMS}}`

## Canonical layer order

1. Contracts
2. Domain
3. Application
4. Adapters
5. Presentation
6. Composition

Cross-cutting lanes:

- Tests lane
- Documentation lane

## Dependency rule

Only outer layers depend inward:

- `Composition -> Presentation -> Adapters -> Application -> Domain -> Contracts`

## Build/refactor sequence

For every vertical:

1. Tests (Red)
2. Contracts
3. Domain
4. Application
5. Adapters
6. Presentation
7. Composition
8. Tests (Green)
9. Refactor
10. Documentation updates

## Vertical execution map

Document each major vertical here with per-layer build order and exit criteria.

## Quality gates

- Add project-specific automated checks
- Add project-specific smoke checks

## Governance hooks

When any vertical changes behavior:

1. Update layer docs under `docs/architecture/layers/`
2. Update vertical docs under `docs/architecture/verticals/`
3. Update module mapping under `docs/modules/`
4. Update decisions docs under `docs/decisions/` if tradeoffs changed
