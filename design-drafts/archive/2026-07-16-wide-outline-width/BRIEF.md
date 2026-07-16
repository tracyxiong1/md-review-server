# Feature Brief: Wider Outline On Wide Screens

## Goal

Use additional wide-screen workspace to show more of long document headings without changing the centered document card or the existing medium and compact outline behavior.

## Source Runtime Baseline Files

- `design-drafts/runtime-baseline/01-dark-collapsed-comments-closed-empty.png`
- `design-drafts/runtime-baseline/06-light-collapsed-comments-closed-empty.png`
- `design-drafts/archive/2026-07-16-document-outline-layout/DECISION.md`
- User-provided wide-screen screenshot from 2026-07-16.

## States To Cover

- Wide preview with the detached full-text outline.
- Extra-wide preview with long English headings.
- Medium integrated outline.
- Compact tick rail below the existing `760px` document-card threshold.
- Dark and light themes.

## Constraints

- Keep the document card at its existing `820px` maximum width and centered position.
- Keep the detached outline `24px` from the preview's left edge.
- Preserve the existing `160px` outline at the `1240px` wide-layout threshold.
- Increase only the extra-wide outline to `240px` when the preview reaches `1440px`.
- Preserve single-line ellipsis for headings that still exceed the wider column.
- Do not add resizing, collapsing, borders, or new controls.

## Open Questions

None. The extra-wide breakpoint is content-driven: at `1440px`, a centered `820px` card leaves enough room for a `240px` outline and a `46px` gap before the document.
