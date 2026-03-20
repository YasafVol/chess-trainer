# {{PROJECT_NAME}}

## Project overview

- Repo root: `{{REPO_ROOT}}`
- Main runtime stack: `{{STACK}}`
- Current objective: `{{OBJECTIVE}}`
- Quality bar: `{{QUALITY_BAR}}`
- Deferred items: `{{DEFERRED_ITEMS}}`

## FITL Nav governance

Canonical layer order:

1. Contracts
2. Domain
3. Application
4. Adapters
5. Presentation
6. Composition

Dependency rule:

- Outer depends inward only.
- `Composition -> Presentation -> Adapters -> Application -> Domain -> Contracts`

TDD rule:

1. Red
2. Green
3. Refactor

Definition of done:

1. Code integrated
2. Tests added at the right layer and passing
3. FITL docs updated in `docs/`

## FITL-first workflow

- Before planning or implementing a non-trivial change, read the relevant FITL docs first.
- Start with `docs/README.md`, then the relevant vertical doc, then the relevant module doc, then linked decisions and risks.
- Do not plan or implement from source inspection alone when FITL docs already exist.
- If the FITL docs are stale or confusing, update them as part of the work.

## Documentation policy

- Update `docs/architecture/`, `docs/modules/`, and `docs/decisions/` for non-trivial changes.
- Keep deprecated docs as pointer stubs instead of silently deleting history.

## Quality policy

- Prefer automated checks first.
- Enforce vertical execution order:
  - tests -> contracts -> domain -> application -> adapters -> presentation -> composition -> tests -> refactor -> docs
