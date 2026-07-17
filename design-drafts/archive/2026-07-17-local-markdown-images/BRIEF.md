# Feature Brief: Local Markdown Images

## Goal

Render local images referenced with Markdown relative paths, resolving each image from the directory of the Markdown file being reviewed.

## Source Runtime Baseline

- `../../runtime-baseline/html/03-dark-collapsed-comments-open-with-comments.html`
- `../../runtime-baseline/html/05-light-expanded-comments-open-with-comments.html`
- `../../runtime-baseline/html/07-dark-color-compatibility.html`
- `../../runtime-baseline/html/08-light-color-compatibility.html`

## States To Cover

- CLI mode with an image beside the Markdown file
- Directory mode with nested Markdown and image paths
- Remote image URLs
- Missing, unsupported, and out-of-root local image paths
- Existing dark/light and comments/sidebar states remain unchanged

## Constraints

- Preserve the existing Markdown image layout and responsive sizing.
- Resolve relative image paths from the current Markdown file, not the browser URL.
- Only expose supported image files inside the review root.
- Reject traversal outside the review root and non-image files.
- Keep remote image behavior unchanged.

## Open Questions

- None blocking. HTML `<img>`, uploads, editing, and image-file hot reload are outside this requirement.
