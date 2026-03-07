# Module Map

This directory is the FITL Nav module axis. Each module doc maps implementation surfaces to the canonical layers.

Major modules:
1. `web-app.md`
2. `chess-core-package.md`

Use this mapping when scoping a refactor:
1. Pick the vertical doc first.
2. Use module docs to identify exact files by layer.
3. Execute inside-out (tests -> contracts -> domain -> application -> adapters -> presentation -> composition -> tests -> refactor -> docs).
