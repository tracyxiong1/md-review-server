# Feature Brief: Hidden Document Outline Scrollbar

## Goal

Remove the visible scrollbar from the document outline and reduce the visual weight of the main document scrollbar while preserving scrolling behavior.

## Source Runtime Baseline Files

- `design-drafts/runtime-baseline/01-dark-collapsed-comments-closed-empty.png`
- `design-drafts/runtime-baseline/06-light-collapsed-comments-closed-empty.png`
- `design-drafts/runtime-baseline/html/01-dark-collapsed-comments-closed-empty.html`

## States To Cover

- Dark and light themes.
- Full text outline and compact tick rail.
- Long outlines that overflow their sticky viewport.
- Long documents that overflow the main reader viewport.

## Constraints

- Hide only the outline's internal scrollbar.
- Preserve `overflow-y: auto` and all existing scrolling behavior.
- Keep the main document scrollbar visible at `6px`, with a transparent track, low-contrast thumb, and stronger hover state.
- Do not change outline width, content truncation, active-heading state, or tooltip behavior.

## Open Questions

None. The scrollbar should remain visually hidden in every outline layout state.
