# Decision Profile - {{DATE}}

## Context

Describe why this FITL setup exists in this project.

## Locked Decisions

1. Canonical layer model is fixed as Contracts, Domain, Application, Adapters, Presentation, Composition.
2. Dependency rule is fixed: outer layers depend inward only.
3. Implementation flow is fixed per vertical:
   - tests(red) -> contracts -> domain -> application -> adapters -> presentation -> composition -> tests(green) -> refactor -> docs
4. Documentation updates are mandatory for non-trivial changes.
5. Definition of Done includes docs, tests, and code.

## Active Compromises

1. Add project-specific compromises here.

## Deferred Items

1. Add project-specific deferred items here.

## Revisit Triggers

1. Add project-specific revisit triggers here.

## Governance Enforcement

- Every PR with behavior change must update:
  - relevant `docs/architecture/layers/*.md`
  - relevant `docs/architecture/verticals/v*.md`
  - relevant `docs/modules/*.md`
  - `docs/decisions/OPEN_ISSUES_AND_COMPROMISES.md` when risks or deferrals change
