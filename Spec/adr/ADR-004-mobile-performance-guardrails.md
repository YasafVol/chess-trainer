# ADR-004: Mobile Performance Floor and Long-Game Guardrails

**Status**: Accepted  
**Date**: 2026-02-25

## Context

The app must remain responsive on mobile while running in-browser analysis. User target is depth 16 default. Without policy guardrails, long games can cause UI stalls and thermal issues.

## Decision

Set mobile analysis baseline:

1. Default depth: **16**
2. Default `multiPV`: **1**
3. Default threads: **1**
4. Default hash budget: **16-32 MB**
5. Per-position soft time cap: **600-1200 ms**

Define long-game thresholds:

1. Normal: `<= 200` plies
2. Long: `201-300` plies
3. Very long: `> 300` plies

## Guardrail Policy

## `<= 200` plies

1. Run full analysis pass at depth 16.

## `201-300` plies

1. First pass at depth 14, or analyze every second ply.
2. Offer user-triggered refine pass for full depth-16 coverage.

## `> 300` plies

1. Start key-position-first mode:
   - checks
   - captures
   - high evaluation swing positions
2. Require explicit user action for full deep pass.

## Global Runtime Guardrails

1. Cancel in-flight analysis when new run starts.
2. Pause/suspend when tab is hidden.
3. Stop foreground batch when total runtime budget is exceeded (default 60s), then offer resume.
4. Persist incremental results to avoid lost progress.

## Trade-offs

### Benefits

1. Keeps UI responsive on mobile.
2. Reduces battery and thermal pressure.
3. Preserves analysis quality path through opt-in refinement.

### Costs

1. Some long-game runs are approximate on first pass.
2. More UX states (queued/partial/refined) to communicate clearly.

## Revisit Trigger

Revisit when:

1. Device benchmark telemetry supports more aggressive defaults.
2. Worker/runtime optimizations significantly reduce cost at depth 16.
3. Product preference shifts from responsiveness to analysis completeness by default.
