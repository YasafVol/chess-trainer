# Composition Layer

## Purpose
Wire runtime entrypoints, dependency construction, and lifecycle registration for each executable target.

## Features / Responsibilities
- Plugin startup/shutdown and command/processor registration.
- Web app root rendering and route tree construction.
- Mock web runtime bootstrap and route-level dependency selection.
- Companion service bootstrap, middleware registration, and shutdown hooks.

## Data / Contracts
- Runtime configuration: plugin settings defaults, engine flavor selection, mock-vs-cloud runtime mode, service env vars.
- Composition contracts define which concrete adapters are injected into flows.

## Key Files
- `main.ts` (`onload`, command registration, processor registration)
- `apps/web/src/main.tsx`
- `apps/web/src/router.tsx`
- `apps/web/src/lib/mockData.ts`
- `stockfish-service/src/index.ts`

## Internal Flows
- Construct clients/adapters and bind lifecycle handlers.
- Register global listeners and teardown logic.
- Route or command entrypoints into application flows.
- In the current web runtime, bootstrap directly into local IndexedDB-backed mock services without auth gating.

## User-Facing Flows
- Determines whether users can trigger features reliably after startup.
- Governs runtime readiness signals (engine init state, storage availability, service health).

## Tests / Quality Gates
- Startup smoke tests per runtime:
  - plugin enable/disable without leaked listeners
  - web boot and route navigation without runtime errors
  - service start/health/analyze sequence
- Needed:
  - explicit composition tests for dependency wiring and fallback paths

## Open Risks / Deferred Items
- Plugin `main.ts` is a monolithic composition hotspot and refactor priority.
- Service startup tightly couples initialization and server start; isolate boot phases for testability.
- Convex/auth composition is scaffolded but deferred until the mock runtime is validated in production.
