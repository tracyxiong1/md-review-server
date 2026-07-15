# Decision: Document Heading Outline

## Final direction

Markdown Preview now includes heading navigation inside the document card in both CLI and directory browsing modes.

- Parse and show every Markdown `H1` through `H6` heading.
- Use a `160px` full-text outline when the card is at least `520px` wide.
- Below `520px`, use a `32px` tick rail with decreasing `H1` through `H6` lengths.
- Mark the active section in blue, keep it visible inside the independently scrolling outline, and support click and keyboard navigation.
- In compact mode, show a bounded `Hn + full title` tooltip on hover or focus. Keep it inside the visible preview and outside the comments panel.
- Hide the outline for no-heading documents and Diff mode. Do not add manual collapse or persistence.

## Why

The initial `160px` outline works in normal reading layouts but becomes too expensive when the `240px` file sidebar and `300px` comments panel are both open. At the `785px` runtime viewport, the document card falls to `233px`; the fixed outline left only about `71px` for the body including padding. The compact rail increases that body region to about `199px` while preserving section position and jump targets.

Using a container query makes the behavior follow the document card's real space rather than guessing from the browser viewport. The `520px` threshold keeps the full outline when titles remain useful and applies the rail only when reading width needs protection.

## Superseded

- A permanently visible `160px` outline in all layouts was rejected after the three-panel runtime review.
- Manual collapse and persisted outline state remain deferred; the automatic card-width mode change handles the current extreme case without adding controls.
- Body-preview text inside the compact tooltip was omitted. Heading level and full title are sufficient for the first version.

## Landed in

- `src/lib/extractDocumentHeadings.ts`
- `src/components/DocumentOutline.tsx`
- `src/components/MarkdownPreview.tsx`
- `src/styles/markdown.css`
- Related component and parser tests.

## Baseline updated

Yes. All eight runtime baseline cases were recaptured at `785 × 994`, including dark/light themes, file sidebar collapsed/expanded, comments closed/open, commented/empty documents, and Mermaid/code compatibility. `cases.json` now records document-card and outline mode measurements.

Additional review screenshots capture the rejected fixed-outline extreme and the final compact rail with its bounded tooltip.
