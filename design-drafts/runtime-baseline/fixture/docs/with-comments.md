# Codex handoff review

The review page collects comments on selected Markdown text. Codex should read open comments and continue analysis without making the user return to chat manually.

## Current flow

Users select exact text, add comments, then copy or describe those comments back to Codex.

## Proposed flow

A compact handoff control in the comments panel submits open comments to Codex and keeps the result visible in the review state.

## Failure state

If the handoff cannot start, the user should see a clear retry path and a copyable fallback prompt.
