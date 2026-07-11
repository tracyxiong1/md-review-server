# Decision: Frontmatter Comment Marker Alignment

## Final Direction

Track how many source lines are removed while parsing frontmatter, preserve line slots when stripping MDX imports and exports, then translate target-file line anchors into rendered-body line numbers before grouping and positioning processed-comment markers.

## Why

The review workflow records `targetStartLine` against the complete generated Markdown file, while ReactMarkdown receives only the body after frontmatter removal. Correcting this boundary restores target markers without changing the body-relative source anchors already stored by the selection UI.

## Superseded

- Changing all rendered line attributes to absolute file lines was rejected because it would invalidate existing source comment sidecars.
- A visual marker redesign was out of scope; the existing gutter marker remains unchanged.

## Landed In

- `src/lib/parseMdContent.ts`
- `src/components/MarkdownPreview.tsx`
- `src/components/MarkdownPreview.test.tsx`
- `skills/markdown-review-loop/SKILL.md`

## Baseline Updated

No. This is an anchor-coordinate bug fix with no visual or interaction change to the product surface.
