# PDR-1 Research Brief

Date: 2026-03-24
Linear Ticket: `EXP-10`

## Purpose

This brief establishes the shared defaults and source inputs for the product-design research stream.

The scope of this stream is limited to:

- landing-page product direction
- chess workbench interaction direction
- puzzle product direction
- Google Stitch prompt and concept preparation
- deployment and auth constraints relevant to product/design review

This stream does not choose implementation structure unless a product option is infeasible without it.

## Locked Defaults

- Public landing page is assumed to live at `/`.
- The current import experience is assumed to move to `/import` in the eventual product shape.
- The default landing direction is `Workbench Showcase`.
- The default workbench direction to evaluate is `Unified Study Workbench`.
- The default puzzle direction to evaluate is `Bank-First Refinement`.
- Convex and Google auth are active runtime constraints and remain in scope only as constraints.
- This stream is product/design-first and should avoid implementation planning language wherever possible.

## Working Questions

### Landing

- What should the public homepage sell?
- What should be static storytelling versus product preview?
- How should signed-out users be converted into authenticated product users?

### Workbench

- What interaction language should define replay, analysis, and board state?
- Which behaviors should feel shared between game study and puzzle study?
- What level of product ambition is justified without committing to a deeper study-workspace redesign?

### Puzzles

- Should the next product step focus on better bank discovery, stronger session training, or deeper teaching?
- What information should be visible before opening a puzzle?
- What hint, reveal, and retry behavior feels instructional without becoming heavy?

### Stitch

- How can Stitch accelerate concept generation for these surfaces without dictating implementation?
- What should be accepted as layout inspiration versus corrected manually in Figma?

### Constraints

- What deployment/auth realities materially affect public-page and signed-out design choices?
- What constraints should be carried into design review so later implementation is not blocked by false assumptions?

## Source Documents

### Canonical repo guidance

- `AGENTS.md`
- `docs/README.md`
- `docs/modules/web-app.md`

### Product verticals

- `docs/architecture/verticals/v2-replay-and-navigation.md`
- `docs/architecture/verticals/v5-puzzle-generation-and-review.md`
- `docs/architecture/verticals/v6-game-view-and-analysis-workbench.md`

### Product and research specs

- `Spec/PRODUCT_DESIGN_RESEARCH_2026-03-23.md`
- `Spec/LINEAR_TICKETS_PRODUCT_DESIGN_RESEARCH_2026-03-24.md`

### Runtime and route surfaces

- `apps/web/src/routes/root.tsx`
- `apps/web/src/router.tsx`
- `apps/web/src/routes/import.tsx`
- `apps/web/src/routes/game.tsx`
- `apps/web/src/routes/puzzles.tsx`
- `apps/web/src/routes/puzzle.tsx`
- `apps/web/src/routes/puzzlesContinuous.tsx`
- `apps/web/src/presentation/PuzzleTrainer.tsx`
- `apps/web/src/styles.css`

### Constraint surfaces

- `apps/web/src/lib/runtimeGateway.tsx`
- `apps/web/convex/auth.ts`
- `apps/web/convex/http.ts`
- `apps/web/.env.example`
- `apps/web/README.md`
- `vercel.json`

## Research Boundaries

### In Scope

- product framing
- design directions
- low-fidelity flows
- visual thesis statements
- static versus live-preview guidance
- Stitch prompts and review guidance
- design-facing constraint memos

### Out Of Scope

- route refactors
- auth rewiring
- board abstraction work
- puzzle-system extraction
- implementation estimates
- code changes to ship the final product

## Expected Outputs For Downstream Tickets

- `PDR-2` should return three landing directions plus one recommendation.
- `PDR-3` should return three workbench directions plus one recommendation.
- `PDR-4` should return three puzzle directions plus one recommendation.
- `PDR-5` should produce a Stitch-ready prompt pack and review rubric.
- `PDR-6` and `PDR-7` should produce short design-facing constraint memos.
- `PDR-8` should merge all outputs into one coherent review.

## Review Standard

- The work should be understandable by design, PM, and engineering stakeholders.
- Recommendations must be distinct and decision-useful.
- Product language should stay grounded in the actual app, not generic chess-app claims.
- Constraints must be concrete enough to prevent infeasible design choices.
