# Feature Brief: Document Outline Layout Refinement

## Goal

Refine the shipped document outline so it uses wide-screen whitespace instead of reducing the readable document width, removes unnecessary horizontal preview gutters in constrained layouts, and keeps the clicked outline item stable during smooth navigation.

## Source Runtime Baseline Files

- `design-drafts/runtime-baseline/01-dark-collapsed-comments-closed-empty.png`
- `design-drafts/runtime-baseline/04-dark-expanded-comments-open-with-comments.png`
- `design-drafts/runtime-baseline/05-light-expanded-comments-open-with-comments.png`
- `design-drafts/runtime-baseline/06-light-collapsed-comments-closed-empty.png`
- `design-drafts/runtime-baseline/cases.json`

## States To Cover

- Dark and light themes.
- File sidebar collapsed and expanded.
- Comments sidebar collapsed and expanded.
- Wide, medium, and constrained preview widths.
- Full text outline and compact tick rail.
- Click navigation, smooth-scroll progress, manual scroll interruption, and ordinary scroll tracking.

## Constraints

- Keep the readable document card at its existing `820px` maximum width.
- On wide previews, place the full outline near the preview's left edge instead of attaching it to the document card.
- Do not add a separate outline card, toolbar, or collapse control.
- Remove the preview's unused horizontal gutter when space is constrained.
- Preserve the `520px` compact-outline threshold and existing tooltip behavior.
- Keep comments about `300px` wide and do not change server APIs.
- A clicked outline item must remain active throughout programmatic smooth scrolling.

## Open Questions

None. The layout direction and navigation behavior were confirmed on 2026-07-16.
