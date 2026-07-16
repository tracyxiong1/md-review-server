# Decision: Wider Outline On Wide Screens

## Final Direction

Keep the existing three document-outline states and add one extra-wide refinement:

- Below the detached threshold, preserve the integrated `160px` outline and existing `32px` compact rail behavior.
- From `1240px` to `1439px` of preview width, keep the detached outline at `160px`.
- At `1440px` and above, widen only the detached outline column to `240px`.
- Keep the `820px` document card centered at every detached width.

Long headings remain single-line and use ellipsis only after consuming the wider column.

## Why

The `160px` detached outline protects the document at the first wide breakpoint, but it leaves useful workspace unused on larger screens and truncates English task headings too aggressively. A second content-driven breakpoint uses that extra space without changing reading width or adding another interaction.

At the `1440px` threshold, the centered `820px` card starts `310px` from the preview edge. A `240px` outline positioned `24px` from that edge ends at `264px`, leaving a `46px` gap before the document card.

## Preserved Behavior

- The document remains centered and capped at `820px`.
- Medium and compact layouts do not change.
- Outline scrolling, active-state tracking, ellipsis, and tooltips do not change.
- No resize, collapse, border, or persistence control is added.

## Landed In

- `src/styles/markdown.css`
- `src/styles/markdown.test.ts`
- `DESIGN.md`

## Baseline Updated

The frozen runtime HTML includes the new extra-wide container rule. Existing screenshots, root fragments, and DOM metrics remain unchanged because the committed baseline viewport is `785px` wide and does not enter the extra-wide state.
