# Composition Layer

## Purpose
Wire runtime entrypoints, dependency construction, and lifecycle registration for each executable target.

## Features / Responsibilities
- Plugin startup/shutdown and command/processor registration.
- Web app root rendering and route tree construction.
- Companion service bootstrap, middleware registration, and shutdown hooks.

## Data / Contracts
- Runtime configuration: plugin settings defaults, engine flavor selection, service env vars.
- Composition contracts define which concrete adapters are injected into flows.

## Key Files
- `main.ts` (`onload`, command registration, processor registration)
- `apps/web/src/main.tsx`
- `apps/web/src/router.tsx`
- `stockfish-service/src/index.ts`

## Internal Flows
- Construct clients/adapters and bind lifecycle handlers.
- Register global listeners and teardown logic.
- Route or command entrypoints into application flows.

## User-Facing Flows
- Determines whether users can trigger features reliably after startup.
- Governs runtime readiness signals (engine init state, service health).

## Tests / Quality Gates
- Startup smoke tests per runtime:
  - plugin enable/disable without leaked listeners
  - web boot and route navigation without runtime errors
  - service start/health/analyze sequence.
- Needed:
  - explicit composition tests for dependency wiring and fallback paths.

## Open Risks / Deferred Items
- Plugin `main.ts` is a monolithic composition hotspot and refactor priority.
- Service startup tightly couples initialization and server start; isolate boot phases for testability.
