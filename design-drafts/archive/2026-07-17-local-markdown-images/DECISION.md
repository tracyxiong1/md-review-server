# Decision: Local Markdown Images

## Final Direction

Relative Markdown image sources are rewritten to a local read-only asset endpoint using the current Markdown file as their resolution base. The server returns common browser image formats from inside the review root.

Remote, protocol-relative, root-relative, fragment, and other explicitly schemed image sources keep their existing behavior.

## Why

- Markdown authors can keep portable relative references such as `./assets/diagram.png` and `../images/flow.svg`.
- Resolving on the server avoids coupling file paths to the browser page URL.
- Root-bound lexical and real-path checks prevent traversal and symlink escape.
- Restricting responses to known image extensions avoids turning the endpoint into a general local file reader.
- The existing responsive image styling already fits the product's document-first visual system.

## Superseded

No visual drafts were needed. The feature reuses the current Markdown rendering and image layout.

## Landed In

- `src/components/MarkdownPreview.tsx`
- `src/components/MarkdownPreview.test.tsx`
- `server/app.js`
- `server/app.test.js`
- `README.md`

## Validation

- Current-workspace test suite: 27 files and 208 tests passed.
- TypeScript and Vite production build passed.
- Changed JavaScript and TypeScript files passed ESLint.
- Changed files passed Prettier checks.

## Baseline Updated

No. The feature adds resource resolution without changing controls, spacing, styles, or persistent UI states.
