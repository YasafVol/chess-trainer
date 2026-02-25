# ADR-001: Board UI Library for Web App

**Status**: Accepted  
**Date**: 2026-02-25

## Context

The web app needs a robust interactive board with strong mobile behavior and predictable drag/drop state handling. Two viable options were evaluated:

1. `chessground`
2. `chessboard-element`

## Decision

Use **`chessboard-element`** for web v1.

## Why

1. Licensing: `chessboard-element` is MIT, simpler for product flexibility.
2. Migration speed: team already has implementation experience with it.
3. Lower legal coupling risk versus adopting GPL-dependent frontend composition.

## Trade-offs

### Benefits

1. License posture is straightforward.
2. Faster migration from existing rendering model.
3. Web component API is easy to isolate behind a board adapter.

### Costs

1. Fewer built-in advanced chess UX features than `chessground`.
2. More custom behavior code required for richer interactions.
3. Existing plugin race-condition patterns must be avoided by design.

## Guardrails

1. Implement a board adapter interface to keep swap option open.
2. Do not directly mirror plugin drag/drop lifecycle code.
3. Add deterministic integration tests for:
   - Legal/illegal drops
   - Promotion flows
   - Divergence from imported PGN line

## Revisit Trigger

Re-evaluate this ADR if any of the following happens:

1. Board interaction defects remain high after adapter hardening.
2. Product requires advanced features only practical in `chessground`.
3. License strategy changes to explicitly allow GPL constraints.
