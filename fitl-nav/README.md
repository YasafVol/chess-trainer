# FITL Nav

FITL Nav is a dual-axis project navigation framework:

1. Functional Intent
2. Technical Layer

It is designed to answer four questions quickly:

1. What does the product do?
2. Where is each concern implemented?
3. In what order should we build or refactor safely?
4. What decisions, compromises, and deferrals exist?

## What this extraction contains

- A generic governance model
- A canonical layered architecture scaffold
- Vertical feature doc templates
- Module mapping templates
- Decision and risk templates
- A project-agnostic docs index

## Extraction goal

This directory is the first step toward a standalone GitHub repository and later a reusable setup tool.

Current scope:

1. Extract the framework definition
2. Remove chess-project specifics
3. Preserve only reusable structure and conventions

Not in scope yet:

1. CLI or installer implementation
2. GitHub publishing automation
3. Package manager distribution

## Directory layout

- `templates/AGENTS.md`
- `templates/docs/README.md`
- `templates/docs/architecture/`
- `templates/docs/modules/`
- `templates/docs/decisions/`
- `templates/docs/quality/`
- `EXTRACTION_PLAN.md`

## Intended future repo shape

1. `README.md`
2. `templates/`
3. `examples/`
4. `scripts/` or `bin/`
5. `docs/`

## Template variable style

Templates use `{{PLACEHOLDER}}` tokens.

Core placeholders:

- `{{PROJECT_NAME}}`
- `{{REPO_ROOT}}`
- `{{STACK}}`
- `{{OBJECTIVE}}`
- `{{QUALITY_BAR}}`
- `{{DEFERRED_ITEMS}}`
- `{{DATE}}`
- `{{FEATURE_NAME}}`
- `{{MODULE_NAME}}`

## Canonical FITL rules

Layer order:

1. Contracts
2. Domain
3. Application
4. Adapters
5. Presentation
6. Composition

Dependency rule:

- Outer depends inward only.
- `Composition -> Presentation -> Adapters -> Application -> Domain -> Contracts`

Execution order per vertical:

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
