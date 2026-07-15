# Document Outline Layout Refinement

## Goal

Correct two issues found during runtime review of the document outline:

1. The preview keeps a horizontal gutter that wastes scarce width in constrained layouts.
2. The `160px` outline shares the document card's `820px` maximum width on wide screens, reducing the readable body to about `660px`.

The same change also fixes outline navigation feedback that briefly activates every intermediate heading during a smooth jump.

## Layout Decision

The preview uses three structural states based on the available preview width.

### Wide Preview

When the preview is at least `1240px` wide:

- The document card remains centered with an `820px` maximum width.
- The `160px` outline is removed from the document card's grid flow and positioned `24px` from the preview's left edge.
- The outline stays visually quiet on the workspace background. It has no independent card, shadow, title bar, or right divider.
- The outline remains sticky and independently scrollable.

This state uses otherwise empty workspace space and preserves the established document line length.

### Medium Preview

Below the detached-outline threshold:

- The outline and document body retain the existing integrated presentation.
- The combined reader may use up to `980px`, allowing the `160px` outline and `820px` document body to coexist when space is available.
- The combined reader shrinks to the available width rather than forcing horizontal overflow.

### Constrained Preview

- The preview scroll area keeps its existing vertical padding but removes fixed horizontal padding, so the document uses the full space between application side panels.
- The document-card container query remains authoritative: below `760px`, the outline becomes the `32px` compact tick rail so reading width takes priority.
- The compact tick rail has no right divider. Spacing separates it from the body, while the blue active tick remains the location cue. The integrated full-outline state keeps its existing divider.
- Compact tooltip boundaries, hierarchy ticks, click targets, and keyboard behavior remain unchanged.

## Navigation State Decision

Click navigation and passive scroll tracking must not compete for the active outline state.

When an outline item is activated:

1. Store the target heading as a pending programmatic navigation.
2. Set the clicked heading active immediately.
3. Start the existing reduced-motion-aware `scrollIntoView` behavior.
4. While the programmatic scroll is moving, ignore intermediate active-heading calculations.
5. When scrolling settles, clear the pending navigation without replacing the clicked active item. The next ordinary scroll event resumes position tracking.

Wheel, touch, pointer, or scrolling-key input from the user cancels the pending programmatic navigation so ordinary scroll tracking resumes without waiting for the animation to finish.

The settle detection must follow scroll activity rather than a fixed animation duration because browser smooth-scroll duration varies with distance and user settings.

## Component Boundaries

- `MarkdownPreview` owns the preview-width layout class, pending navigation state, scroll-settle detection, and active-heading calculation.
- `DocumentOutline` remains presentational. It renders headings and forwards navigation requests without managing document scroll state.
- `markdown.css` owns the detached, integrated, and compact layout states through container queries.
- Heading extraction, stable IDs, comments, selection, and server APIs do not change.

## Testing

Automated tests must verify:

- A clicked heading remains active while intermediate headings cross the scroll threshold.
- Active-heading tracking resumes after programmatic scrolling settles.
- User scroll input cancels a pending navigation.
- The reader and outline receive the classes required for detached and integrated layout states.
- Existing compact-outline, tooltip, Diff, no-heading, theme, and comment-marker tests continue to pass.

Runtime verification must cover:

- Wide preview with collapsed side panels: outline near the left edge and an `820px` document card.
- Medium preview: integrated full outline without horizontal overflow.
- Three-panel constrained preview: no unused horizontal gutter and a `32px` compact rail.
- Dark and light themes.
- Clicking a distant heading and manually interrupting a smooth jump.

## Acceptance Criteria

- Wide-screen outline placement does not reduce the document card's width.
- The outline is visibly separated from the document and aligned near the preview's left edge on wide screens.
- Constrained previews do not reserve the previous `30px` left and right gutters.
- Compact mode activates below a `760px` document-card width.
- Compact mode has no gray divider between the tick rail and body; full integrated mode retains its divider.
- Clicking a heading produces one stable active state, not a sequence of intermediate active headings.
- Manual scrolling continues to update the active heading.
- Existing tests, build, lint, and formatting checks pass.
