# Feature Brief: File Tree Version Scrolling

## Goal

Keep long file lists and long version histories independently usable without allowing either section to push the sidebar footer out of view.

## Source Runtime Baseline Files

- `design-drafts/runtime-baseline/04-dark-expanded-comments-open-with-comments.png`
- `design-drafts/runtime-baseline/05-light-expanded-comments-open-with-comments.png`
- `design-drafts/runtime-baseline/fragments/04-dark-expanded-comments-open-with-comments.root.html`
- `design-drafts/runtime-baseline/fragments/05-light-expanded-comments-open-with-comments.root.html`

## States To Cover

- Dark and light themes.
- Short and long file lists.
- Empty, short, and long version histories.
- Sidebar heights where the file and version sections must share space.

## Constraints

- Keep the header and footer fixed inside the sidebar.
- Give the file list at least `120px` and allow it to scroll independently.
- Limit the version section to `45%` of sidebar height and scroll version rows inside it.
- Use the same quiet `6px` WebKit scrollbar treatment and Firefox `thin` fallback as the document page.
- Preserve version-row semantics, labels, counts, and file-selection behavior.

## Open Questions

None. File and version scrolling remain separate, and version rows stay in the existing Versions section.
