# Design Drafts

This directory stores design references, runtime baselines, active explorations, and archived drafts for md-review-server.

The rule of thumb:

**Runtime baseline is fact. Design drafts are proposals. Final docs are decisions.**

## Source Of Truth

Use these files before starting review UI or Codex handoff work:

1. [`../PRODUCT.md`](../PRODUCT.md): product purpose, users, principles, and trust boundaries.
2. [`../DESIGN.md`](../DESIGN.md): visual system, component rules, and UI constraints.
3. [`runtime-baseline/`](./runtime-baseline/): real running app states captured as screenshots, frozen HTML, `#root` fragments, and DOM metrics.

When runtime HTML exists, it is the primary UI reference. Hand-written static drafts are secondary and must not override runtime evidence.

## Current Baseline

[`runtime-baseline/`](./runtime-baseline/) is the current source of truth for the product UI.

It covers:

- sidebar collapsed and expanded
- comments panel open and closed
- no comments and active comments
- dark and light themes
- screenshots, frozen full-page HTML, root fragments, and measured DOM dimensions

Start here for Codex handoff:

- [`runtime-baseline/html/03-dark-collapsed-comments-open-with-comments.html`](./runtime-baseline/html/03-dark-collapsed-comments-open-with-comments.html)
- [`runtime-baseline/html/05-light-expanded-comments-open-with-comments.html`](./runtime-baseline/html/05-light-expanded-comments-open-with-comments.html)
- [`runtime-baseline/cases.json`](./runtime-baseline/cases.json)

## Draft Status

### Current

- `runtime-baseline/`: authoritative runtime UI baseline.

### Archived Decisions

- [`archive/2026-07-06-comment-replies/`](./archive/2026-07-06-comment-replies/): shipped multi-round comment replies with flat `Codex` / `你` threads, open-tab default, and gutter-centered review markers.
- [`archive/2026-07-15-document-minimap/`](./archive/2026-07-15-document-minimap/): initial shipped H1-H6 document outline with a `160px` full mode and a `32px` compact rail below the original `520px` card breakpoint.
- [`archive/2026-07-16-document-outline-layout/`](./archive/2026-07-16-document-outline-layout/): current wide, integrated, and compact outline layout with a `760px` compact threshold and stable smooth-scroll navigation.
- [`archive/2026-07-16-document-outline-scrollbar/`](./archive/2026-07-16-document-outline-scrollbar/): hides the outline's internal scrollbar while preserving independent scrolling.
- [`archive/2026-07-16-file-tree-version-scroll/`](./archive/2026-07-16-file-tree-version-scroll/): keeps file and version lists independently scrollable while preserving the sidebar header and footer.
- [`archive/2026-07-16-wide-outline-width/`](./archive/2026-07-16-wide-outline-width/): expands the detached outline to `240px` on extra-wide previews without moving the centered document.

### Superseded Static Drafts

These were useful during exploration, but should not be used as implementation baselines:

- [`archive/2026-07-02-superseded-static/codex-handoff-review.html`](./archive/2026-07-02-superseded-static/codex-handoff-review.html)
- [`archive/2026-07-02-superseded-static/product-baseline-current.html`](./archive/2026-07-02-superseded-static/product-baseline-current.html)
- [`archive/2026-07-02-superseded-static/product-handoff-from-baseline.html`](./archive/2026-07-02-superseded-static/product-handoff-from-baseline.html)

Reason: they were hand-written or source-inferred static HTML and have been replaced by runtime-captured HTML.

### Early Exploration Drafts

These are concept references only:

- [`archive/2026-07-01-explorations/codex-balanced-review-inline.html`](./archive/2026-07-01-explorations/codex-balanced-review-inline.html)
- [`archive/2026-07-01-explorations/codex-balanced-review-light.html`](./archive/2026-07-01-explorations/codex-balanced-review-light.html)
- [`archive/2026-07-01-explorations/codex-balanced-review-typography.html`](./archive/2026-07-01-explorations/codex-balanced-review-typography.html)
- [`archive/2026-07-01-explorations/codex-balanced-review.html`](./archive/2026-07-01-explorations/codex-balanced-review.html)
- [`archive/2026-07-01-explorations/codex-minimal-review.html`](./archive/2026-07-01-explorations/codex-minimal-review.html)
- [`archive/2026-07-01-explorations/codex-native-review.html`](./archive/2026-07-01-explorations/codex-native-review.html)
- [`archive/2026-07-01-explorations/codex-review-workbench.html`](./archive/2026-07-01-explorations/codex-review-workbench.html)
- [`archive/2026-07-01-explorations/feishu-codex-doc-review.html`](./archive/2026-07-01-explorations/feishu-codex-doc-review.html)

Use them only for historical context or idea mining. Do not copy their structure, spacing, icons, or layout into implementation without validating against `runtime-baseline/`.

## Recommended Lifecycle

### 1. Before A Requirement Starts

Create an active requirement folder:

```txt
design-drafts/active/YYYY-MM-DD-feature-name/
```

Add a `BRIEF.md`:

```md
# Feature Brief: Feature Name

## Goal

What user problem this solves.

## Source Baseline

- ../../runtime-baseline/html/03-dark-collapsed-comments-open-with-comments.html
- ../../runtime-baseline/html/05-light-expanded-comments-open-with-comments.html

## States To Cover

- dark / light
- sidebar collapsed / expanded
- comments open / closed
- empty / with comments
- loading / success / failed, if relevant

## Constraints

- Keep comments panel about 300px wide.
- Avoid tall blocks above the first comment.
- Reuse existing compact buttons, status pills, tabs, and panel rhythm.
```

### 2. During Design

Keep drafts inside the active folder:

```txt
design-drafts/active/YYYY-MM-DD-feature-name/
  BRIEF.md
  v1.html
  v1-notes.md
  screenshots/
  critique.md
```

Each HTML draft should include metadata near the top:

```html
<!--
status: active
basedOn:
  - ../../runtime-baseline/html/03-dark-collapsed-comments-open-with-comments.html
purpose: Compact Codex handoff row
-->
```

### 3. After Implementation Lands

Create a `DECISION.md` in the active folder:

```md
# Decision: Feature Name

## Final Direction

What shipped.

## Why

Why this direction won.

## Superseded

Which drafts were rejected and why.

## Landed In

- src/components/...
- src/styles/...

## Baseline Updated

Yes or no. If no, explain why.
```

Then move the active folder to:

```txt
design-drafts/archive/YYYY-MM-DD-feature-name/
```

If the shipped UI changes the product surface, refresh `runtime-baseline/` with new screenshots, frozen HTML, root fragments, and metrics.

## Cleanup Rules

- Do not add new loose `.html` files at the top level.
- Do not use old static drafts as source of truth.
- Do not keep generated system files such as `.DS_Store` as design artifacts.
- Move outdated drafts into `archive/` once their status is clear.
- Update `PRODUCT.md`, `DESIGN.md`, or `.impeccable/design.json` when a design decision becomes a reusable product rule.
