# Google Stitch Mockup Workflow

Date: 2026-03-25

## Purpose

This document explains how to use Google Stitch to create mockups for the Chess Trainer product before implementation starts.

The goal is not to generate production-ready code. The goal is to generate fast visual concepts, pick directions, and move the chosen layouts into Figma for cleanup and handoff.

## What Stitch Can Do

Based on Google's current announcements, Stitch can:

- generate UI from natural-language prompts
- generate UI from images or wireframes
- iterate conversationally on the design
- adjust themes
- export to Figma
- export frontend code
- connect screens into working prototypes using the newer `Prototypes` feature

## What We Should Use It For

Use Stitch for:

- layout exploration
- hierarchy exploration
- screen variants
- early visual direction
- quick multi-screen flow concepts
- mockup export into Figma

Do not use Stitch as:

- the source of truth for implementation
- the source of truth for product behavior
- the final copy source
- the final component spec

## Working Rule For This Repo

For Chess Trainer, Stitch output should be treated as:

- visual exploration first
- Figma handoff material second
- implementation inspiration only after manual cleanup

This matters because the real product has constraints Stitch will not know:

- authenticated Convex runtime
- Google auth via Convex
- read-only offline fallback
- TanStack Router route boundaries
- existing chess-specific board/eval/puzzle behavior

## Surfaces We Need

We need three Stitch mockup tracks:

1. Public landing page
2. Game analysis workbench
3. Puzzle bank and puzzle trainer

## Recommended Stitch Workflow

### Step 1: Start With One Surface At A Time

Do not prompt Stitch for the whole product at once.

Use separate generations for:

- landing
- workbench
- puzzles

This keeps each output focused and reduces generic blended UI.

### Step 2: Use A Narrow Prompt

Each first prompt should define:

- screen type
- signed-in or signed-out state
- primary job of the screen
- visual style
- desktop/mobile expectation
- what must be prominent
- what must be avoided

### Step 3: Generate Multiple Variants

For each surface, generate 2 to 4 variants.

Do not refine the first result immediately. First compare:

- hierarchy
- board prominence
- product clarity
- CTA clarity
- whether the result looks like Chess Trainer rather than a generic SaaS page

### Step 4: Refine Only One Winner

Pick one variant and iterate only that one.

Use follow-up prompts to adjust:

- spacing
- typography emphasis
- layout rhythm
- hero composition
- board/eval/move-list prominence
- calmness vs density

### Step 5: Use Prototypes Only After Screens Exist

Once the static screens are acceptable, use Stitch `Prototypes` to connect them into a small user flow.

Recommended prototype flow:

1. Landing page
2. Post-sign-in import/workbench entry
3. Puzzle bank
4. Puzzle trainer

The prototype is for flow review, not production interaction specification.

### Step 6: Export To Figma

Once the chosen screen directions are stable:

- paste to Figma
- clean up spacing
- fix copy
- normalize components
- align visual language across all three surfaces

### Step 7: Reject Direct Code Export As Source Of Truth

If Stitch exports HTML/CSS or frontend code, treat it as disposable reference.

Do not implement from that export directly.

## Prompt Pack

### Prompt A: Landing Page

Create a responsive web landing page for a product called Chess Trainer. This is a signed-out public homepage. The product imports chess games, analyzes mistakes, and turns them into training puzzles. The design direction is a workbench showcase, not generic SaaS marketing. The first screen must have one large chess board or analysis-workbench visual, one short headline, one primary Google sign-in CTA, and one secondary workflow CTA. Include sections for import, analysis, puzzle generation, and personal training value. Use product cues like eval graphs, move lists, and puzzle cards as polished previews, not as a live dashboard. The page should feel premium, restrained, and readable on desktop and mobile. Avoid cards everywhere, avoid logo clouds, and avoid generic startup illustrations.

### Prompt B: Game Workbench

Create a responsive chess game-analysis workbench for a web app. The board is the main anchor. The eval graph and move list must feel tightly synchronized with the board. Include replay controls, flip board, manual exploration state, and analysis context. The interface should feel like a calm study surface, not a dashboard of unrelated widgets. Prioritize clarity of current board state, move selection, and graph interaction. Show both desktop and mobile interpretations. Avoid clutter and avoid over-decorated panels.

### Prompt C: Puzzle Bank And Trainer

Create a responsive chess puzzle product concept for a web app with two surfaces: a puzzle bank and a puzzle trainer. The bank should help users understand due items, ownership, difficulty, and themes at a glance. The trainer should feel focused and coach-like, with clear status, hints, reveal, retry, and solution playback states. Keep the visual language aligned with the same product family as the landing page and workbench. Avoid gamified noise, excessive badges, and arcade-style visuals. Prioritize trust, clarity, and fast scanning.

## Good Follow-Up Prompts

Use these after the first generation.

### Landing Refinement

- Make the board and eval graph larger and reduce generic marketing chrome.
- Reduce the amount of copy by 30 percent and make the CTA more obvious.
- Make the first screen feel more like a chess study poster and less like a SaaS homepage.
- Keep the page brighter and cleaner, with one warm accent color only.

### Workbench Refinement

- Make the board the visual anchor and reduce visual competition from side panels.
- Make the move list and eval graph feel more synchronized with the selected position.
- Make the interface calmer and less dashboard-like.
- Improve mobile hierarchy without removing the board-first feel.

### Puzzle Refinement

- Make due items and difficulty easier to scan in the bank.
- Make the trainer feel more instructional and less game-like.
- Show clearer hint, reveal, and retry states.
- Reduce visual noise and keep the board area dominant.

## What To Upload As Inputs

Stitch can also work from images or wireframes. For our flow, the best inputs are:

- screenshots of the current app
- rough wireframes
- simple whiteboard sketches
- one or two reference images for tone only

Use current app screenshots when you want Stitch to stay grounded in:

- board proportions
- move-list shape
- eval graph placement
- puzzle card density

Do not upload too many references at once.

## What To Review In Each Output

### Landing

- Is the product clearly chess-specific in the first screen?
- Is the workbench the story, or did Stitch drift into generic marketing?
- Is the CTA clear?
- Is the signed-out state obvious?

### Workbench

- Is the board still the anchor?
- Do graph and move list read as one study system?
- Does the layout feel calm enough to study in?
- Is mobile still believable?

### Puzzles

- Can users scan what is due and what matters?
- Does the trainer feel focused?
- Are hints and retry states visually legible?
- Does the product still feel part of the same app family?

## What Must Be Fixed In Figma

- final spacing
- real copy
- CTA wording
- consistent typography scale
- real product state naming
- board/eval/move-list proportions
- mobile tap-target quality
- consistency across landing, workbench, and puzzle surfaces

## Deliverables We Want Out Of Stitch

For this project, the minimum good output is:

1. 2 to 4 landing variants
2. 2 to 4 workbench variants
3. 2 to 4 puzzle variants
4. 1 selected winner per surface
5. 1 small prototype flow connecting the chosen screens
6. 1 Figma cleanup pass after export

## Decision Standard

Choose concepts that:

- look like serious chess study software
- make the board central
- support the public `/` landing assumption
- are consistent across landing, workbench, and puzzles
- avoid generic card-grid SaaS design

## Practical Limitation

This guide is based on current official Google descriptions of Stitch. I did not complete a live interactive Stitch session from this environment, so the exact UI clicks may differ slightly from the product UI. The workflow here is grounded in the capabilities Google currently documents publicly.

## Sources

- [Google Developers Blog: From idea to app: Introducing Stitch](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/)
- [Google Blog: 5 things from I/O 2025 you can try right now](https://blog.google/innovation-and-ai/products/io-2025-tools-to-try-globally/)
- [Google Blog: Stitch from Google Labs gets updates with Gemini 3](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-gemini-3/)
