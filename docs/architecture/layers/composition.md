# Composition Layer

## Purpose

Wire runtime entrypoints, dependency construction, and lifecycle registration for the executable web target.

## Features / Responsibilities

- App root rendering and TanStack Router construction
- Authenticated runtime bootstrap and dependency selection
- Engine flavor selection and startup behavior
- Include Convex/auth providers on the active shipped runtime path while preserving offline read fallback

## Key Files

- `apps/web/src/main.tsx`
- `apps/web/src/router.tsx`
- `apps/web/src/lib/runtimeGateway.tsx`

## Tests / Quality Gates

- Web boot and route navigation without runtime errors
- Build output that loads the worker and engine assets correctly
- Needed:
  - explicit composition tests for dependency wiring and fallback paths

## Open Risks / Deferred Items

- Deployment smoke automation is still missing.
- Convex deployment and Vercel project linkage now have to stay aligned so GitHub-triggered releases publish both backend and frontend together.
