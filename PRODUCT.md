# Product

## Register

product

## Users

Codex users and AI-assisted document authors who review Markdown drafts inside a local browser while continuing the revision loop in Codex. They are usually working in a constrained Codex/browser split view, so the interface must stay compact, predictable, and low-noise.

## Product Purpose

md-review-server provides a local Markdown review workbench for visual selection, inline comments, status tracking, and iterative document revision with Codex. Success means users can point at exact text in a Markdown document, submit focused comments, hand those comments to Codex with clear local state, let Codex generate the next version, then inspect the result without losing comment context.

## Brand Personality

Quiet, precise, local-first. It should feel like a Codex-native workbench rather than a marketing site, generic Markdown previewer, or heavyweight document suite.

## Anti-references

Do not make it look like a landing page, GitHub clone, decorative dashboard, or enterprise document portal. Avoid large blue primary controls, busy toolbars, card stacks, marketing copy, oversized typography, and visual elements that compete with the document text.

## Design Principles

- Keep the document and selection flow central.
- Make comments feel anchored to text, not stored in a detached side app.
- Use runtime-captured baselines before shaping UI changes. Static mockups are secondary to real app HTML, screenshots, and DOM measurements.
- Treat Codex handoff as review state inside the comments workflow, not as a separate action center.
- Reuse existing panel, tab, pill, and compact button patterns for automation controls.
- Make automation state explicit before and after Codex acts: queued comments, target file, completion, failure, and retry paths should stay visible.
- Prefer compact controls with familiar icons and clear hover/focus states.
- Support dark and light themes with the same hierarchy and density.
- Preserve local-tool trust: no surprise network behavior, no account-centric UX.
- Keep local trust visible. Automation, analytics, and network-adjacent behavior should use plain UI copy and never imply account-based sync or remote document upload.

## Runtime Design Baseline

Before changing the review UI, compare against the captured runtime baseline in `design-drafts/runtime-baseline/`. The baseline includes screenshots, frozen full-page HTML, `#root` fragments, and DOM metrics for collapsed/expanded sidebars, comments open/closed, empty/commented states, and dark/light themes. These artifacts are the product UI source of truth for Codex handoff work.

## Accessibility & Inclusion

Aim for WCAG AA contrast for text and interactive controls. Preserve keyboard access for buttons and textareas, visible focus states, readable status labels, reduced-motion friendly transitions, and color-independent status communication.
