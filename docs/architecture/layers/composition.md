# Composition Layer

## Purpose

Wire runtime entrypoints, dependency construction, and lifecycle registration for the executable web target.

## Features / Responsibilities

- App root rendering and TanStack Router construction
- Mock runtime bootstrap and dependency selection
- Engine flavor selection and startup behavior
- Exclude deferred Convex/auth surfaces from the active shipped runtime path

## Key Files

- `apps/web/src/main.tsx`
- `apps/web/src/router.tsx`
- `apps/web/src/lib/mockData.ts`

## Tests / Quality Gates

- Web boot and route navigation without runtime errors
- Build output that loads the worker and engine assets correctly
- Needed:
  - explicit composition tests for dependency wiring and fallback paths

## Open Risks / Deferred Items

- Mock and future cloud composition paths still live close together in the same runtime tree.
- Deployment smoke automation is still missing.
- Deferred backend activation must remain opt-in until auth and remote persistence are back in scope.
