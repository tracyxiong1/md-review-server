---
title: README Review Plan
owner: docs-team
status: reviewed
---

# README Review Plan

This guide shows how contributors can review a Markdown document with precise browser comments before publishing.

## Goals

| Goal            | Why it matters                                                                 | Example                                                |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Focus comments  | Reviewers can point to exact text instead of describing locations from memory. | Select a confusing sentence and attach one comment.    |
| Track revisions | Each round keeps previous comments visible for follow-up.                      | Mark resolved notes after Codex writes the next draft. |
| Compare changes | Readers can inspect what changed before accepting a version.                   | Switch to Diff and scan additions and removals.        |

## Reviewer flow

1. Open the Markdown file in the local review workbench.
2. Select a sentence, heading, or table row that needs clarification.
3. Add a short comment with the requested change.
4. Ask Codex to read open comments and produce the next version.
5. Review the diff, then continue with another pass if needed.

## Publishing checklist

- Confirm every open comment has a response.
- Compare the current draft against the previous version.
- Keep screenshots focused on the actual review surface.
- Use the latest version as the source of truth.
