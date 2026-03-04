# Layer Docs Index

This directory is the horizontal FITL Nav axis. Each file documents one canonical layer.

Canonical order:
1. `contracts.md`
2. `domain.md`
3. `application.md`
4. `adapters.md`
5. `presentation.md`
6. `composition.md`

Dependency direction:
- Outer depends inward only.
- `Composition -> Presentation -> Adapters -> Application -> Domain -> Contracts`

Cross-cutting lanes (tracked in all layer docs):
- Tests lane
- Documentation lane

If layer naming changes in future, keep deprecated docs as pointer stubs to preserve history.
