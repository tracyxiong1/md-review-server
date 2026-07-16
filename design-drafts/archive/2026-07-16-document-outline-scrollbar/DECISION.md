# Decision: Document Scrollbar Refinement

## Final Direction

The document outline keeps `overflow-y: auto` but no longer paints a scrollbar. `scrollbar-width: none` covers Firefox and modern Chromium, while `::-webkit-scrollbar { display: none; }` covers WebKit-based rendering.

The main document scrollbar remains visible. WebKit-based browsers use an explicit `6px` rail with a transparent track, neutral thumb, pill radius, and stronger hover color. Firefox uses its compact native width with the same neutral thumb and transparent track colors.

## Why

The visible outline scrollbar competes with heading labels and makes the outline look like a separate utility panel. The outline already communicates scroll position through its moving list and active heading, so the scrollbar adds visual weight without adding necessary navigation.

The main document scrollbar still communicates position in long documents, so it is reduced rather than removed. The explicit WebKit `6px` treatment and Firefox `thin` fallback preserve that affordance without the heavy native track shown in the previous runtime.

## Preserved Behavior

- Mouse wheel, trackpad, touch, and keyboard scrolling remain available.
- Full and compact outline widths do not change.
- Active-heading tracking, click navigation, truncation, and tooltips do not change.
- The main document scrollbar remains available and its scrolling behavior is unchanged.
- This document-scrollbar change does not alter code blocks, comments, the file tree, or other scroll containers.

## Landed In

- `src/styles/markdown.css`
- `src/styles/markdown.test.ts`
- `DESIGN.md`

## Baseline Updated

The frozen runtime HTML and baseline documentation were updated with both scrollbar rules. Existing baseline screenshots and metrics are unchanged because their short fixture outlines do not overflow and their captured page position does not expose the scrollbar treatment clearly; both behaviors are covered by source-level CSS regression tests.
