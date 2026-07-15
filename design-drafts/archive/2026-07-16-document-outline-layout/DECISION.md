# Decision: Document Outline Layout Refinement

## Final Direction

The document outline now protects reading width across three layout states:

- On preview areas at least `1240px` wide, the `160px` full outline sits `24px` from the preview's left edge while the `820px` document card remains centered.
- Below the detached threshold, the full outline and document body share an integrated reader that can use up to `980px`.
- When the document card is below `760px`, the outline becomes a `32px` tick rail. The compact rail has no gray right divider; spacing and the blue active tick provide the visual cue.

The preview no longer reserves fixed horizontal gutters in constrained layouts. Manual collapse remains out of scope.

## Navigation

Click navigation owns the active outline state until smooth scrolling settles, so intermediate headings no longer flash as active. Wheel, touch, pointer, and scrolling-key input cancel the pending navigation and immediately restore ordinary scroll tracking.

## Why

The original integrated `160px` outline reduced the readable body on wide screens even though unused workspace was available. It also switched to compact mode only below `520px`, which allowed the full outline to consume too much of medium-width document cards.

The detached wide state uses otherwise empty workspace without changing the established document line length. Raising the compact threshold to `760px` makes body width the default priority, and removing the compact divider keeps the tick rail visually subordinate to the document.

## Superseded

- The original `520px` compact threshold is replaced by `760px`.
- Attaching the full outline to the centered document card on wide previews is replaced by left-edge placement.
- The gray divider in compact mode is removed; the integrated full-outline divider remains.
- Manual collapse, resizable outline width, and persisted visibility remain deferred.

## Landed In

- `src/components/DocumentOutline.tsx`
- `src/components/MarkdownPreview.tsx`
- `src/styles/markdown.css`
- Related component regression tests.

## Baseline Updated

Yes. All eight runtime baseline cases were recaptured at `785 × 994`, including dark and light themes, file sidebar collapsed and expanded, comments closed and open, commented and empty documents, and Mermaid/code compatibility.

At that viewport, the document card now measures about `697px` with both side panels collapsed, `459px` with comments open, and `265px` with the file and comments panels open. All three states use the `32px` compact rail and preserve more body width than the previous baseline.
