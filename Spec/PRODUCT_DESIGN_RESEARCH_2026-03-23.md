# Product Design Research Review

Date: 2026-03-23

## Purpose

This review is intentionally product-first. It packages research and concept directions for:

- the new public landing page
- chess board and game workbench behaviors
- puzzle behavior and feature evolution
- Google Stitch-assisted concept generation
- Convex/Vercel deployment constraints relevant to design
- Google auth via Convex constraints relevant to design

This document does not choose implementation structure beyond what is needed to reject infeasible product directions.

## Baseline Constraints

- The active runtime is the authenticated Convex-backed web app under `apps/web`.
- The current `/` route is the import flow, and the signed-out experience is only a minimal auth gate.
- The design default for the next product pass is:
  - public `/`
  - landing style biased toward `Workbench Showcase`
  - research first, implementation later
- Convex and Google auth are active runtime constraints, not subjects of redesign.

## Product Option Matrix

| Area | Option | What It Emphasizes | Strength | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Landing | Workbench Showcase | Board, eval graph, analyze-to-puzzle workflow | Best match to actual product differentiator | Needs strong product preview visuals | Recommended |
| Landing | Product Poster | Bold brand and short product story | Most visually memorable | Can drift into generic chess-app marketing | Secondary |
| Landing | Serious Utility | Reliable training workflow and study value | Lowest hype, strongest credibility | Less emotionally distinctive | Secondary |
| Workbench | Conservative Polish | Current board with cleaner controls and UX | Lowest risk | Limited product step-up | Secondary |
| Workbench | Unified Study Workbench | Shared interaction language across game and puzzle flows | Best balance of ambition and clarity | Needs disciplined scope later | Recommended |
| Workbench | Advanced Analysis Workspace | Deep study surface with richer variation handling | Strong long-term story | Too much for a research-first pass to commit to | Future |
| Puzzles | Bank-First Refinement | Better bank discovery and trainer usability | Fastest product value | Less differentiated by itself | Recommended now |
| Puzzles | Session-First Trainer | Continuous mode as the main product | Strong habit loop | Requires more product decisions | Secondary |
| Puzzles | Coach-First Teaching | Explanatory, lesson-like puzzle review | Strongest differentiation | Needs richer data and copy model | Future-facing |

## Landing Page Directions

### 1. Workbench Showcase

**Hero concept**

"Import games. Analyze mistakes. Train the exact positions that lost them."

The first screen is a product poster built around a board, eval graph, and puzzle conversion moment, not around generic marketing blocks.

**Section structure**

1. Hero with board/workbench visual and Google CTA
2. Three-step workflow: import, analyze, train
3. Product proof section for game replay, eval graph, and auto-generated puzzles
4. Study value section: personal mistakes, persistent library, read-only offline access
5. Final CTA

**CTA strategy**

- Primary: `Continue with Google`
- Secondary: `See the workflow`

**Signed-out to signed-in path**

- Signed-out users land on `/`
- Primary CTA signs in with Google
- Default post-login destination should be `/import`

**Static vs live preview**

- Static: landing hero, workflow illustrations, puzzle bank mock, copy
- Real product preview: can reuse screenshots or static exports from actual app surfaces
- Avoid live authenticated widgets on the landing page

### 2. Product Poster

**Hero concept**

"A chess trainer that turns your real games into repeatable study."

This direction is more art-directed and brand-led. The board is still present, but the first screen behaves more like a launch page than a product console.

**Section structure**

1. Poster-style hero
2. One strong feature block
3. Product atmosphere and story
4. Final CTA

**CTA strategy**

- Primary: `Start studying`
- Secondary: `View the system`

**Signed-out to signed-in path**

- Same as above: `/` to Google sign-in to `/import`

**Static vs live preview**

- Mostly static product storytelling
- Real product visuals should be treated as art-directed supporting evidence, not embedded app fragments

### 3. Serious Utility

**Hero concept**

"A reliable workflow for importing games, reviewing mistakes, and training them back."

This direction treats the homepage as a trustworthy study tool overview instead of a marketing surface.

**Section structure**

1. Utility-first hero
2. Import and persistence
3. Analysis and replay
4. Puzzle review and repetition
5. Final CTA

**CTA strategy**

- Primary: `Sign in with Google`
- Secondary: `Read the workflow`

**Signed-out to signed-in path**

- Same path, but copy should emphasize account-backed persistence

**Static vs live preview**

- Mostly static
- Product previews should be simple and documentary, not stylized

## Recommended Landing Direction

**Choice:** `Workbench Showcase`

**Visual thesis**

A crisp chess study poster: pale training-camp background, one dark workbench surface, one board as the anchor, one warm accent used only for action and position emphasis.

**Why**

- It sells the actual product rather than a generic chess promise.
- It naturally connects landing, workbench, and puzzle design work into one visual language.
- It can use real product shapes without pretending the signed-out landing page is a live app.

**Low-fidelity flow**

1. User lands on `/`
2. Sees workbench hero with one obvious promise and one obvious CTA
3. Scrolls through workflow and proof
4. Clicks `Continue with Google`
5. Auth completes
6. User arrives at `/import`

## Chess Board / Workbench Behavior Directions

### 1. Conservative Polish

**Replay controls**

- Keep Prev, Next, Reset, Play/Pause, Flip
- Add clearer disabled states and labels

**Manual variation behavior**

- Keep current drag-to-explore behavior
- Add stronger "you are off the main line" state

**Eval graph interaction**

- Keep click-to-jump
- Add hover and selected-point feedback

**Move-list sync**

- Add active move auto-scroll and clearer current move emphasis

**Keyboard behavior**

- Add basic replay shortcuts

**Puzzle carryover**

- Shared tone and terminology only
- Puzzle remains a separate interaction surface

### 2. Unified Study Workbench

**Replay controls**

- Keep current controls, but make the board the center of a coherent study surface

**Manual variation behavior**

- Show branch state more explicitly
- Make return-to-line behavior obvious

**Eval graph interaction**

- Treat graph, move list, and board as one synchronized study cluster

**Move-list sync**

- Current move, graph point, and board position should always read as one state

**Keyboard behavior**

- Replay keys become part of the product, not an afterthought

**Puzzle carryover**

- Puzzle board should inherit the same interaction grammar for highlights, status, and playback

### 3. Advanced Analysis Workspace

**Replay controls**

- Adds a more serious study-desk feel with denser control surfaces

**Manual variation behavior**

- Variation lane becomes a visible concept

**Eval graph interaction**

- Scrubbing and deeper graph-led navigation become central

**Move-list sync**

- Move list behaves more like a study timeline than a simple move list

**Keyboard behavior**

- Richer keyboard navigation and focus behavior

**Puzzle carryover**

- Puzzle becomes a sibling study mode within the same mental model

## Recommended Workbench Direction

**Choice:** `Unified Study Workbench`

**Visual thesis**

The board is the anchor, the graph is the pulse, and the move list is the narrative. Everything else should feel like support, not competition.

**Why**

- It gives the product a stronger interaction identity without overcommitting to a heavy study UI.
- It aligns well with the landing direction.
- It also gives puzzles a cleaner visual handoff later.

**Low-fidelity flow**

1. User opens a game
2. Board, move list, and eval graph present one synchronized state
3. User replays, jumps, flips, and explores
4. Analysis results deepen the same surface
5. Product language stays consistent when the user later enters puzzle review

## Puzzle Behavior Directions

### 1. Bank-First Refinement

**Bank layout and metadata**

- Add due badges, ownership badges, source-game context, and short review status

**Filtering model**

- Extend beyond severity, ownership, and single difficulty
- Add due-state and theme-level filtering

**Solve flow**

- Keep current trainer flow

**Hint ladder**

- Keep simple hinting with one or two progressive steps

**Reveal / retry behavior**

- Keep current model, but explain outcomes more clearly

**Continuous mode**

- Keep as a focused training route

**Post-session summary**

- Add basic recap only

### 2. Session-First Trainer

**Bank layout and metadata**

- Bank becomes a launchpad into custom sessions

**Filtering model**

- Session setup replaces much of the bank filtering importance

**Solve flow**

- Trainer becomes the main product, not the bank

**Hint ladder**

- Can stay moderate

**Reveal / retry behavior**

- Becomes part of a session-level repeat strategy

**Continuous mode**

- Evolves into configurable sessions

**Post-session summary**

- Important and visible

### 3. Coach-First Teaching Experience

**Bank layout and metadata**

- Each puzzle carries more learning context

**Filtering model**

- Themes and learning goals matter more than only difficulty

**Solve flow**

- Puzzle experience teaches, not just scores

**Hint ladder**

- Piece -> square -> motif -> move

**Reveal / retry behavior**

- Should explain why a move failed

**Continuous mode**

- May become lighter relative to the teaching surface

**Post-session summary**

- Focus on lessons and repeated weakness patterns

## Recommended Puzzle Direction

**Choice:** `Bank-First Refinement`

**Visual thesis**

The puzzle bank should feel sortable and trustworthy, while the trainer should feel calm, direct, and slightly coach-like without becoming verbose.

**Why**

- It gives the cleanest immediate product improvement without inventing a heavier teaching model too early.
- It stays compatible with the current product shape.
- It leaves room for a later coach-first layer if the product wants more differentiation.

**Low-fidelity flow**

1. User opens puzzle bank
2. Quickly understands what is due and why it matters
3. Filters into a smaller set
4. Opens a puzzle
5. Solves, retries, or reveals with clearer feedback
6. Returns to bank or enters continuous mode with more context

## Google Stitch Prompt Pack

Use Stitch for concept generation and Figma handoff only. Treat exported output as starting material, not implementation truth.

### Prompt 1: Landing

Create a responsive web landing page for a product called Chess Trainer. The page is for signed-out users. The product imports chess games, analyzes mistakes, and turns them into training puzzles. The design direction is a workbench showcase, not generic SaaS marketing. First screen must feature one large chess board/workbench visual, short headline, one primary Google sign-in CTA, and one secondary workflow CTA. Include sections for import, analysis, puzzle generation, and personal training value. Use real product UI cues like eval graphs and move lists, but present them as polished previews, not a live app dashboard. Keep the page premium, restrained, and desktop/mobile ready.

### Prompt 2: Workbench

Create a responsive chess analysis workbench screen for a web app. The board is the anchor. An eval graph and move list must feel tightly synchronized with the board. Show replay controls, flip board, manual exploration state, and analysis context. The screen should feel like a calm study surface rather than a card-heavy dashboard. Avoid visual clutter. Prioritize clarity of board state, move selection, and graph interaction. Show desktop and mobile behavior.

### Prompt 3: Puzzles

Create a responsive chess puzzle product concept for a web app with two surfaces: a puzzle bank and a puzzle trainer. The bank should help users understand due items, ownership, difficulty, and themes at a glance. The trainer should feel focused and coach-like, with clear status, hints, reveal, retry, and solution playback states. Avoid gamified clutter. Prioritize legibility, urgency, and trust. Show a calm visual relationship to the same brand and workbench language used by the landing page and game screen.

## Stitch Review Guidance

### What Stitch should do well

- Fast composition exploration
- Hero/layout direction
- Section order and hierarchy
- Early interaction framing
- Visual consistency checks across surfaces

### What must be corrected in Figma

- Real copy hierarchy
- Route-specific CTA wording
- Mobile spacing and tap targets
- Product-accurate board/eval/move-list relationships
- Any auth-specific or app-specific state details

### What is usable for implementation handoff

- composition
- layout rhythm
- section hierarchy
- motion ideas
- visual language

### What should remain inspiration only

- generated code exports
- invented product states
- any flow that ignores auth, offline-read behavior, or route boundaries

## Convex / Vercel Design Constraints Memo

### Confirmed

- Vercel uses `vercel.json`.
- The current build path runs `cd apps/web && npx convex deploy --cmd 'npm run build'`.
- Declared envs are:
  - `VITE_CONVEX_URL`
  - `CONVEX_SITE_URL`
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`
- `CONVEX_DEPLOY_KEY` is also required for deployment.

### Design-Relevant Risks

- Preview and production deployment separation is not documented clearly in-repo.
- Stale docs still describe Convex/auth as deferred and local-first only.
- A public landing page is feasible, but it should not assume the authenticated app shell is present.
- The public landing design must tolerate the app having no live signed-out data.

### Design Guidance

- Treat landing as a public marketing/product page, not a signed-out live app view.
- Use screenshots, mockups, or static product previews rather than live authenticated widgets.
- Keep the design compatible with a route split between public and authenticated surfaces.

## Google Auth Via Convex Constraints Memo

### Confirmed

- Google auth is already wired through Convex.
- The signed-out CTA can safely reuse the existing Google sign-in action.
- Current sign-in behavior preserves pathname, and the redirect is sanitized to relative paths.

### Design-Relevant Constraints

- Auth is not the blocker for a landing page; routing/layout separation is.
- The current signed-out view is only an auth wall, not a marketing surface.
- The public landing page should not depend on authenticated queries.
- If Convex is misconfigured, the public landing page should still be able to render useful content.

### Design Guidance

- Keep the landing CTA simple: Google sign-in is the main conversion action.
- Use `/import` as the default post-login destination for landing conversion.
- Keep protected-route redirects conceptually separate from landing-page conversion.

## Final Recommendations

- **Landing:** Workbench Showcase
- **Workbench:** Unified Study Workbench
- **Puzzles:** Bank-First Refinement

These three directions form one coherent product story:

1. The landing page sells the workbench.
2. The workbench establishes the interaction language.
3. The puzzle bank and trainer inherit that language while staying calmer and more task-focused.

## Next Review Step

Review this document and choose whether the next deliverable should be:

- low-fidelity wireframes in markdown/Figma-ready outline form
- a Stitch iteration pass using the prompt pack above
- or a narrowed design brief for only one surface area first
