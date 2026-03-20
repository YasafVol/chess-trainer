# Extraction Plan

## Objective

Turn the FITL Nav material currently embedded in this repository into a portable starter that can later become a standalone GitHub repository and setup tool.

## What is generic and should move

1. FITL governance rules
2. Canonical layer taxonomy
3. Dependency rule
4. TDD workflow
5. Layer doc structure
6. Vertical doc structure
7. Module mapping structure
8. Decision and compromise tracking structure
9. Documentation index ordering

## What is project-specific and should stay behind

1. Chess feature names and verticals
2. Web app route/module names
3. Stockfish-specific reference material
4. Project quality gates tied to this runtime
5. Repository-specific commands and deployment details

## Extraction strategy

1. Normalize naming and structure into reusable templates
2. Replace project specifics with placeholders
3. Preserve one example of each doc type
4. Keep the extraction self-contained in `fitl-nav/`
5. Delay installer or CLI design until the template set stabilizes

## Candidate next steps after extraction

1. Move `fitl-nav/` into a dedicated repository
2. Add `examples/` for common stacks:
   - SPA
   - backend service
   - monorepo
3. Add an init script that copies templates into a target project
4. Add config-driven token replacement
5. Add a validator that checks required FITL docs exist

## Proposed standalone repo name

- `fitl-nav`

## Proposed first tool surface

One of:

1. `npx fitl-nav init`
2. `pnpm dlx fitl-nav init`
3. shell script bootstrap for manual adoption
