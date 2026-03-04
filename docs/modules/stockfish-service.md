# Module: Stockfish Companion Service

## Scope
Node/Express HTTP service under `stockfish-service` that wraps native Stockfish.

## Layer Placement
- Contracts:
  - `stockfish-service/src/types.ts`
- Domain:
  - `stockfish-service/src/engine/UciParser.ts`
- Application:
  - orchestration currently embedded in `stockfish-service/src/routes/analyze.ts`
- Adapters:
  - `stockfish-service/src/engine/StockfishProcess.ts`
  - HTTP handlers in `stockfish-service/src/routes/*.ts`
- Presentation:
  - API surface (`/health`, `/analyze`) and JSON responses
- Composition:
  - server boot and lifecycle in `stockfish-service/src/index.ts`

## Notes
- Service lacks automated tests; add adapter and orchestration tests before production hardening.
- Hosted deployment remains deferred while local API contract matures.
