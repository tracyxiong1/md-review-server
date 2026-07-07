# Decision: Comment Replies And Confirmation

## Final Direction

Use `v7-author-label-thread.html` as the implementation direction.

Replies render as a compact flat text thread inside the existing comment item:

- `Codex · time`
- reply body
- `你` reply composer for open comments that already have replies

Reply metadata uses a stable author column so `Codex` and `你` align with the same time column. Recent timestamps render relatively (`刚刚`, `n分钟前`, `n小时前`); older timestamps render as concrete local dates (`7月8日 10:30`, with year only when needed).

No avatars, no chat bubbles, no nested reply cards, no new visible confirmation status.

## Why

This keeps the comments panel aligned with the runtime baseline while adding the missing reply capability. `Open` remains the single state for comments that still need user or Codex attention.

Follow-up runtime fixes from product trial:

- The comments panel defaults to `Open`; `Done` and `All` remain available as history views.
- The comments sidebar auto-expands only when the current file has open comments, so generated documents with only resolved history stay document-first.
- Users can append a new `你` reply from the comments panel on any visible comment. Appending to a `Done` item reopens it as `Open` for the next Codex loop.
- Review markers render in a document gutter overlay instead of inside Markdown content, keeping markers aligned across paragraphs, lists, and multi-round stacked comments. The marker center sits on the document content border.
- Multi-round review is the expected loop: each round reads only current-file open comments, while resolved replies and target markers remain as history.

## Superseded

- `v1-inline-thread.html`: direction was close, but introduced too much new visual structure.
- `v2-confirmation-section.html`: grouping confirmation items broke document-order scanning.
- `v3-latest-carryover-light.html`: useful carryover reference, not the primary dark baseline.
- `v4-open-order-no-extra-status.html`: correct state model, but the static UI still moved too far from the product.
- `v5-baseline-plus-replies.html`: baseline aligned, but inner reply cards felt nested.
- `v6-flat-message-thread.html`: better structure, but avatar marks made the panel feel like chat UI.

## Landed In

- `server/comment-store.js`
- `src/types/review.ts`
- `src/hooks/useComments.ts`
- `src/components/CommentList.tsx`
- `src/components/MarkdownPreview.tsx`
- `src/components/CliModeApp.tsx`
- `src/components/DevModeApp.tsx`
- `src/styles/markdown.css`
- `skills/markdown-review-loop/SKILL.md`
- `DESIGN.md`

## Validation

- Unit/API tests: comment replies persist through store and HTTP PATCH.
- UI tests: `CommentList` renders `Codex` replies and submits `你` replies.
- UI tests: Done comments expose `Add comment`; submitting appends a `你` reply and the hook sends `status: "open"` so the comment re-enters the active queue.
- UI tests: reply timestamps use relative formatting for recent replies and concrete local dates for older replies.
- UI tests: comments default to the `Open` filter; resolved-only comments do not auto-open the sidebar; same-line current and historical comments stack into one marker count; list-item markers render in the gutter layer instead of inside `li` content.
- Runtime E2E: local server at `127.0.0.1:6181`, seeded `sample.v1.md`, verified visible `Codex`, `你`, and `Reply` controls.
- Runtime UI submit: typed `请按修改文档处理。` in the browser, confirmed `r002 author=user` via `/api/comments`.
- Skill-loop E2E: followed `$markdown-review-loop` flow, read open comments, generated `sample.v2.md`, patched comment to `resolved`, appended `r003 author=codex`, and verified target review marker on `sample.v2.md`.

## Baseline Updated

Yes. The full six-case `design-drafts/runtime-baseline/` matrix was recaptured from the running app at `127.0.0.1:6160` after implementation. The fixture now includes reply-thread examples so future UI work can compare against the shipped `Codex` / `你` thread layout, open-tab default, and gutter marker positioning.
