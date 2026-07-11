# Feature Brief: Frontmatter Comment Marker Alignment

## Goal

Restore processed-comment markers when `targetStartLine` uses the target Markdown file's absolute line numbers and the rendered document body excludes frontmatter.

## Source Baseline

- ../../runtime-baseline/html/03-dark-collapsed-comments-open-with-comments.html
- ../../runtime-baseline/html/05-light-expanded-comments-open-with-comments.html

## States To Cover

- Processed target comment in a Markdown file with frontmatter
- Processed target comment in an MDX file with imports or exports
- Existing source comment anchors, which remain body-relative
- Preview mode with the comments panel collapsed

## Constraints

- Keep the existing gutter marker appearance and comments-panel layout unchanged.
- Preserve compatibility with existing source comment sidecars.
- Make the smallest data-to-rendered-line correction; do not redesign the marker UI.

## Open Questions

- None blocking. The review workflow defines target line anchors as line numbers in the new target file.
