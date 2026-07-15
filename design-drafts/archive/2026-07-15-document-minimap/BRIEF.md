# Document Minimap Brief

## Goal

Add a compact document minimap on the left side of the Markdown preview so users can understand their current position and jump quickly to another part of a long document.

## Source runtime baseline files

- `design-drafts/runtime-baseline/03-dark-collapsed-comments-open-with-comments.png`
- `design-drafts/runtime-baseline/05-light-expanded-comments-open-with-comments.png`
- `design-drafts/runtime-baseline/fragments/03-dark-collapsed-comments-open-with-comments.root.html`
- `design-drafts/runtime-baseline/fragments/05-light-expanded-comments-open-with-comments.root.html`
- `design-drafts/runtime-baseline/cases.json`

## States to cover

- Dark and light themes.
- File sidebar collapsed and expanded.
- Comments sidebar collapsed and expanded.
- Short and long Markdown documents.
- Preview and diff modes.
- Current viewport, hover, click, keyboard, and reduced-motion behavior.
- Narrow viewports where the full three-panel layout cannot fit.

## Constraints

- Keep the Markdown document as the primary surface.
- Avoid permanently narrowing an already constrained reading column when both sidebars are expanded.
- Reuse the existing neutral surfaces, compact controls, blue active-state accent, and focus treatment.
- The minimap must track `.markdown-reader-scroll`, not the browser window.
- Navigation must remain usable without relying on color alone.
- Preserve comment markers, text selection, smooth-scroll behavior, and the approximately 300px comments panel.
- Do not show misleading navigation when diff mode is active unless diff scrolling is explicitly supported.

## Context pack

| Fact                                                                                             | Source                                                                           | Confidence |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------- |
| The preview owns an internal scrolling element named `.markdown-reader-scroll`.                  | `src/components/MarkdownPreview.tsx`, `src/styles/markdown.css`                  | High       |
| The left file sidebar is 46px when collapsed and 240px by default when expanded.                 | `src/components/DevModeApp.tsx`, runtime baseline metrics                        | High       |
| The comments sidebar is about 300px and already competes with the document at narrow widths.     | `DESIGN.md`, runtime baseline cases 03–05                                        | High       |
| Clicking a comment currently scrolls a rendered Markdown line into the center and highlights it. | `src/components/MarkdownPreview.tsx`                                             | High       |
| Existing component tests cover sidebar state and line navigation patterns.                       | `src/components/MarkdownPreview.test.tsx`, `src/components/CommentList.test.tsx` | High       |
| The product favors quiet, compact, document-first navigation.                                    | `PRODUCT.md`, `DESIGN.md`                                                        | High       |

## Resolved decisions

- The feature is a structural heading outline covering `H1` through `H6`.
- The first version is always visible when headings exist and does not support manual collapse.
- The outline lives inside the document card and is shared by CLI and directory browsing modes.
- Diff mode hides the outline.
- At `520px` and above, the card shows the full `160px` outline. Below `520px`, it switches to a `32px` heading rail with level ticks and a bounded `Hn + full title` tooltip.
