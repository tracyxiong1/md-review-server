# Feature Brief: Comment Replies And Confirmation

## Goal

Design how Codex replies to review comments when comments may be questions, change requests, or ambiguous requests that need user confirmation.

The key rule:

- If Codex can clearly satisfy the comment, it acts, writes a reply, and resolves the comment.
- If Codex cannot clearly satisfy the comment, it writes a reply asking for confirmation and keeps the comment open.
- Open confirmation comments carry forward to the latest version.
- The UI should not add a separate visible confirmation status. `Open` already means the comment still needs user/Codex attention.
- Comments should remain sorted by document order. Do not group confirmation items ahead of earlier comments.

## Source Baseline

- ../../runtime-baseline/html/03-dark-collapsed-comments-open-with-comments.html
- ../../runtime-baseline/html/05-light-expanded-comments-open-with-comments.html
- ../../runtime-baseline/cases.json

## States To Cover

- Open comment with Codex reply asking for confirmation.
- Resolved comment with Codex reply explaining the completed action.
- Latest-version carryover for unresolved confirmation comments.
- Default tab when opening a file: Open.
- Done as a secondary audit/filter view, not the main work queue.
- Dark and light theme examples.

## Constraints

- Keep comments panel about 300px wide.
- Do not add a separate Codex action center.
- Do not require users to manually choose question/change.
- Reuse existing compact buttons, segmented controls, status pills, and comment item rhythm.
- Avoid tall blocks above the first comment.
