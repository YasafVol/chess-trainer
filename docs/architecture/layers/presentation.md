# Presentation Layer

## Purpose

Render user interfaces, collect user intents, and display system state.

## Features / Responsibilities

- Import, library, game, puzzle-list, puzzle-solve, and backoffice routes
- Analysis progress, move/eval display, eval bar, eval graph, and puzzle review feedback
- Read-only admin config inspection for analysis depths, limits, and classification definitions
- Board controls, SAN/NAG-style move annotations, late-mounted board-host wiring, and keyboard interactions
- TanStack Router links, params, and route-driven screen composition

## Design System

The presentation layer uses Tailwind CSS v4 with shadcn/ui as the component foundation.

### Styling architecture

| Layer | Location | Purpose |
| --- | --- | --- |
| Theme tokens | `apps/web/src/index.css` | oklch color system, spacing, radii, dark mode variables |
| shadcn/ui components | `apps/web/src/components/ui/*.tsx` | Reusable primitives (Button, Card, Badge, Tabs, Input, etc.) |
| Domain-specific CSS | `apps/web/src/styles.css` | Board host sizing, eval bar/graph SVG, FITL canvas absolute positioning |
| Utility composition | Route and presentation `.tsx` files | Tailwind utility classes applied directly in JSX |
| Variant logic | `class-variance-authority` | Component variants (e.g., Button default/outline/ghost/destructive) |

### Key conventions

- **Color tokens** are defined in oklch color space with semantic names (`primary`, `accent`, `destructive`, `muted`, etc.) and support light/dark modes via CSS custom properties.
- **shadcn/ui components** live in `apps/web/src/components/ui/` and use the `cn()` helper from `apps/web/src/lib/utils.ts` for conditional class merging.
- The shared shadcn Tailwind utility layer is vendored in `apps/web/src/shadcn-tailwind.css` so production installs do not depend on the `shadcn` CLI package.
- **Domain-specific CSS** in `styles.css` is reserved for cases where Tailwind utilities are impractical: SVG `vector-effect`, absolute-positioned canvas nodes, and complex gradient eval bar tracks.
- **No `tailwind.config.js`** — Tailwind v4 uses CSS-first configuration via `@theme` blocks in `index.css`.
- **Icons** are sourced from `lucide-react`.

### Adding a new shadcn/ui component

```bash
cd apps/web && npx shadcn@latest add <component-name>
```

Then convert the generated `@/lib/utils` import to `../../lib/utils.js` so the Node test runner can resolve it.

## Key Files

- `apps/web/src/index.css` (Tailwind theme + local shadcn base import)
- `apps/web/src/shadcn-tailwind.css` (vendored shadcn Tailwind utility layer)
- `apps/web/src/styles.css` (domain-specific: eval bar, eval graph, FITL canvas, board host)
- `apps/web/src/lib/utils.ts` (`cn()` class merge utility)
- `apps/web/src/components/ui/*.tsx` (shadcn/ui component library)
- `apps/web/src/routes/root.tsx`
- `apps/web/src/routes/import.tsx`
- `apps/web/src/routes/library.tsx`
- `apps/web/src/routes/game.tsx`
- `apps/web/src/routes/puzzles.tsx`
- `apps/web/src/routes/puzzle.tsx`
- `apps/web/src/routes/backoffice.tsx`
- `apps/web/src/presentation/analysisView.ts`
- `apps/web/src/presentation/backofficeView.ts`
- `apps/web/src/components/InlineLoader.tsx`
- `apps/web/src/components/useDelayedBusy.ts`

## Tests / Quality Gates

- Manual smoke checklist: `Spec/WEB_APP_SMOKE_CHECKLIST.md`
- Needed:
  - route-level component tests
  - accessibility checks for move-list focus and announcements
- Current route-adjacent coverage verifies replay rendering without a synthetic start row, the eval-bar/graph helper state, and the backoffice config sections derived from hardcoded source constants.
- Presentation component tests (`PuzzleActionControls.test.tsx`, `FitlMapExplorer.test.tsx`) run under Node's native test runner — components imported transitively must use relative imports with `.js` extensions (not `@/` aliases) so tsc output resolves correctly.

## Open Risks / Deferred Items

- Presentation still owns too much orchestration in several route files.
- Move-pane focus and scroll behavior still need a dedicated accessibility pass.
- Backoffice values are still read-only and sourced from code constants rather than persisted admin state.
- The `@/` path alias works in Vite but not in the Node test runner; tested presentation files use relative imports as a workaround.
