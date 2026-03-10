# Decision: Analysis Benchmark Isolation and Scope

**Status**: Accepted  
**Date**: 2026-03-10

## Context

The web app needs a repeatable way to compare analysis timing for a real shipped game-analysis run so the foreground budget can be tuned with observed browser-worker behavior instead of estimates. Benchmark runs should not pollute the user’s normal game-analysis history.

## Decision

1. Add a dedicated backoffice benchmark route that runs the real `runGameAnalysis` application path against the bundled `assets/icons/single.pgn` fixture.
2. Persist benchmark run and ply records into a separate IndexedDB database name dedicated to benchmark data.
3. Restrict v1 benchmark sweeps to knobs that are actually wired into the runtime today:
   - engine flavor
   - depth
   - movetime
   - MultiPV
   - base foreground budget
   - foreground budget per ply
4. Exclude `Threads` and `Hash` from v1 benchmark comparisons until the worker path accepts and applies them.

## Consequences

### Benefits

1. Benchmark timings reflect the shipped browser-worker path, including retries and IndexedDB writes.
2. Repeated benchmark runs do not overwrite or mix with user library analysis data.
3. The benchmark result table can be used directly to reason about a safer foreground budget for short games.

### Costs

1. The first benchmark harness is limited to one bundled short game and does not represent long-game sampling behavior.
2. Threads/hash experiments remain blocked until the worker API grows real support for those options.

## Revisit Trigger

Revisit this decision when:

1. The worker runtime accepts configurable `Threads` and `Hash`.
2. The product needs exported benchmark artifacts instead of in-app summaries only.
3. The benchmark suite expands beyond the bundled short-game PGN into a broader scenario matrix.
