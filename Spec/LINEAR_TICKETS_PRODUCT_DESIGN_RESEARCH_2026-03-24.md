# Linear Ticket Set: Product Design Research

Date: 2026-03-24
Prefix: `PDR`
Format: `<prefix>-<#>`

This ticket set converts the product-design research plan into Linear-ready work items. The scope is research, concepting, and synthesis only. These tickets should not be used to start implementation work.

## Ticket Map

| Ticket | Title | Depends On |
| --- | --- | --- |
| PDR-1 | Establish research brief and review inputs | - |
| PDR-2 | Produce landing page product directions | PDR-1 |
| PDR-3 | Produce chess workbench behavior directions | PDR-1 |
| PDR-4 | Produce puzzle behavior directions | PDR-1 |
| PDR-5 | Build Google Stitch prompt pack and concept review | PDR-2, PDR-3, PDR-4 |
| PDR-6 | Write Convex and Vercel design constraints memo | PDR-1 |
| PDR-7 | Write Google auth via Convex design constraints memo | PDR-1 |
| PDR-8 | Synthesize final product and design review | PDR-2, PDR-3, PDR-4, PDR-5, PDR-6, PDR-7 |

---

## PDR-1: Establish research brief and review inputs

**Summary**

Create the working brief for the research pass and lock the defaults that all later tickets will use.

**Scope**

- Confirm the public landing-page assumption for `/`
- Confirm the default landing bias toward `Workbench Showcase`
- Confirm that the pass is product/design only, not implementation planning
- Gather source inputs from the current app, FITL docs, and the research review

**Deliverables**

- One concise research brief
- One list of source documents and repo surfaces to reference
- One shared set of defaults for all later tickets

**Acceptance Criteria**

- The brief states the public `/` assumption explicitly
- The brief states that Convex/auth are constraints, not redesign targets
- The brief states that board and puzzle work are being researched as product surfaces, not implemented
- The brief is sufficient for PDR-2 through PDR-7 to work independently

---

## PDR-2: Produce landing page product directions

**Summary**

Create three distinct landing-page directions and recommend one.

**Scope**

- Define the job of the public landing page
- Produce directions:
  - `Workbench Showcase`
  - `Product Poster`
  - `Serious Utility`
- For each direction, define:
  - hero concept
  - section structure
  - CTA strategy
  - signed-out to signed-in conversion path
  - static vs real-product preview boundary

**Deliverables**

- One option matrix for landing
- Three landing directions
- One recommended direction
- One low-fidelity user flow for the recommended direction

**Acceptance Criteria**

- All three directions are meaningfully distinct
- The recommended direction names a clear visual thesis
- The CTA path ends in Google sign-in and defaults to `/import`
- The output avoids assuming live authenticated widgets on the public page

---

## PDR-3: Produce chess workbench behavior directions

**Summary**

Create three product-level directions for replay, analysis, and board behavior.

**Scope**

- Produce directions:
  - `Conservative Polish`
  - `Unified Study Workbench`
  - `Advanced Analysis Workspace`
- For each direction, define:
  - replay controls
  - manual variation behavior
  - eval graph interaction
  - move-list sync
  - keyboard behavior
  - what carries into puzzle mode vs what stays game-only

**Deliverables**

- One option matrix for workbench behavior
- Three workbench directions
- One recommended direction
- One low-fidelity user flow for the recommended direction

**Acceptance Criteria**

- Each direction describes user-visible interaction changes, not code structure
- The recommended direction has a clear visual and interaction thesis
- The workbench recommendation is compatible with a future public landing preview
- The output stays product-facing and does not lock implementation architecture

---

## PDR-4: Produce puzzle behavior directions

**Summary**

Create three product-level directions for puzzle bank and puzzle trainer evolution.

**Scope**

- Produce directions:
  - `Bank-First Refinement`
  - `Session-First Trainer`
  - `Coach-First Teaching`
- For each direction, define:
  - bank layout and metadata
  - filtering model
  - solve flow
  - hint ladder
  - reveal and retry behavior
  - continuous mode behavior
  - post-session summary

**Deliverables**

- One option matrix for puzzle behavior
- Three puzzle directions
- One recommended direction
- One low-fidelity user flow for the recommended direction

**Acceptance Criteria**

- The three directions are distinct in product strategy, not only visual polish
- The recommended direction has a clear visual thesis
- The output explains how the bank and trainer relate to each other
- The output avoids implementation commitments unless a direction is infeasible

---

## PDR-5: Build Google Stitch prompt pack and concept review

**Summary**

Turn the landing, workbench, and puzzle directions into Stitch-ready prompts and review guidance.

**Scope**

- Create one prompt for landing
- Create one prompt for workbench
- Create one prompt for puzzles
- Define how to evaluate Stitch output
- Define what must be fixed manually in Figma
- Define what is safe to carry forward into implementation handoff

**Deliverables**

- Three Stitch prompts
- One Stitch review rubric
- One handoff note explaining what is inspiration only vs handoff-ready

**Acceptance Criteria**

- Each prompt names the correct signed-in or signed-out context
- Each prompt reflects the recommended direction from PDR-2 through PDR-4
- The review guidance clearly separates layout inspiration from implementation truth
- The output is usable by a designer or PM without repo deep-diving

---

## PDR-6: Write Convex and Vercel design constraints memo

**Summary**

Produce a short design-facing memo describing deployment and environment constraints that affect product and marketing surfaces.

**Scope**

- Confirm deploy path
- Confirm environment requirements
- Call out preview vs production risks
- Call out documentation drift that could confuse design review
- Translate those findings into product/design guidance

**Deliverables**

- One constraints memo for Convex/Vercel

**Acceptance Criteria**

- The memo names the current build/deploy path clearly
- The memo names required envs clearly
- The memo explains why the public landing page must be treated as a static product surface
- The memo stays constraint-focused and does not become an implementation plan

---

## PDR-7: Write Google auth via Convex design constraints memo

**Summary**

Produce a short design-facing memo describing what the current Google auth flow enables and constrains.

**Scope**

- Confirm the current auth flow shape
- Confirm redirect behavior
- Confirm what the public landing page can safely reuse
- Confirm any signed-out or public-route constraints

**Deliverables**

- One constraints memo for Google auth via Convex

**Acceptance Criteria**

- The memo explains that auth is already wired and is not the product blocker
- The memo explains that routing and signed-out presentation are the main design issue
- The memo defines the default landing-page sign-in path clearly
- The memo stays constraint-focused and does not become an implementation plan

---

## PDR-8: Synthesize final product and design review

**Summary**

Merge the outputs of the research tickets into one review document that can drive design selection.

**Scope**

- Consolidate landing, workbench, and puzzle options
- Name one recommended direction per area
- Include low-fidelity flows
- Include the Stitch prompt pack
- Include the two constraint memos
- Present one coherent product story across all three surfaces

**Deliverables**

- One final product/design review

**Acceptance Criteria**

- The review includes:
  - 3 landing options
  - 3 workbench options
  - 3 puzzle options
  - one recommendation per area
  - a Stitch prompt pack
  - a Convex/Vercel constraints memo
  - a Google auth constraints memo
- The review is product-first and readable by design, PM, and engineering stakeholders
- The review does not commit the team to an implementation structure prematurely

---

## Recommended Creation Order

1. PDR-1
2. PDR-2, PDR-3, PDR-4, PDR-6, PDR-7
3. PDR-5
4. PDR-8

## Notes

- If you want a second ticket layer later, the clean split is:
  - research tickets first
  - then design-production tickets
  - then implementation tickets
- The current research review lives in `Spec/PRODUCT_DESIGN_RESEARCH_2026-03-23.md`.
