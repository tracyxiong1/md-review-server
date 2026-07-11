# Codex Color Compatibility

## Goal

Make Mermaid diagrams and fenced-code syntax highlighting readable in Codex light and dark themes, using the approved native-neutral, high-clarity palette.

## Source runtime baseline files

- `../../runtime-baseline/html/01-dark-collapsed-comments-closed-empty.html`
- `../../runtime-baseline/html/05-light-expanded-comments-open-with-comments.html`
- `../../runtime-baseline/cases.json`
- User-provided screenshots of the dark sequence diagram, dark flowchart, and light JSON code block.

## States to cover

- Mermaid flowchart in light mode.
- Mermaid flowchart in dark mode.
- Mermaid sequence diagram in light mode.
- Mermaid sequence diagram in dark mode.
- Highlighted JSON and TypeScript code in light mode.
- Highlighted JSON and TypeScript code in dark mode.
- Live theme switching without a reload.
- Mermaid error fallback in both themes.

## Constraints

- Change colors only; diagram width, height, scaling, overflow, and topology are out of scope.
- Preserve the existing neutral product surface and avoid saturated blue or purple diagram fills.
- Use explicit Mermaid `themeVariables` so sequence labels, actors, signals, notes, and flowchart text do not inherit incompatible defaults.
- Scope syntax colors by `.dark-mode`; do not load two global highlight.js themes simultaneously.
- Keep tables, images, blockquotes, Diff, inline code, and comments UI unchanged.
- Preserve Mermaid strict security mode and error behavior.
- Target WCAG AA contrast for normal text where the renderer exposes controllable foreground/background pairs.

## Open questions

- Diagram sizing and wide-chart behavior are intentionally deferred to a separate design pass.
