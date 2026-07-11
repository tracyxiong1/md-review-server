# Decision: Codex Color Compatibility

## Selected direction

Ship the approved native-neutral, high-clarity palette (方案 A). Mermaid uses its `base` theme with explicit light and dark variables; highlighted code uses app-scoped token colors instead of two competing global highlight.js themes.

## Implementation

- Mermaid light palette uses `#fafaf9` / `#f1f1ef` surfaces, `#242424` primary text, `#3f3f3c` message text, and `#6f6f6b` lines.
- Mermaid dark palette uses `#1b1b1b` / `#2a2a2a` surfaces, `#f2f2f2` actor text, `#d6d6d3` message text, and `#a0a0a0` lines.
- Sequence-specific variables cover actors, signals, labels, loops, notes, activations, and sequence numbers so Mermaid defaults cannot leave dark text on a dark canvas.
- Fenced code keeps one light highlight.js base stylesheet and overrides tokens through `.markdown-content` plus `.dark-mode` selectors. Light JSON keys, strings, and numbers use `#24527a`, `#1f6b5b`, and `#8a4b0e`; dark equivalents use `#9fc7ea`, `#95ccba`, and `#e3bc72`.
- `useDarkMode` now broadcasts a local theme-change event so all hook consumers, including already rendered Mermaid blocks and Diff, update without a reload.
- Mermaid strict security mode and error fallback remain unchanged.

## Scope boundary

No diagram width, height, viewBox, scale, overflow, or topology behavior changed. Wide-diagram adaptation remains a separate future design problem.

## Related component audit

- Tables already use app tokens and horizontal overflow; no competing theme stylesheet was found.
- Images already use bounded width and have no theme-specific color layer.
- Diff uses explicit app theme variables and remounts on theme changes.
- Inline code uses `--code-bg` and `--text-primary`.
- Blockquotes use the existing secondary/tertiary text tokens.
- Mermaid error fallback uses app/status tokens.

No additional component required a color compatibility change.

## Verification evidence

- Focused tests cover light/dark Mermaid variables, removal of theme-link toggling, and synchronization of separate theme-hook consumers.
- Runtime inspection on `repository-architecture.v1.md` confirmed dark sequence actor/message fills of `rgb(242, 242, 242)` and `rgb(214, 214, 211)` and light fills of `rgb(36, 36, 36)` and `rgb(63, 63, 60)`.
- Runtime inspection confirmed the same Mermaid `viewBox` and container dimensions across theme changes.
- Representative text/background contrast ratios are above 4.5:1; the light comment token was adjusted to `#6b6b67` for a 4.61:1 ratio on `#eeeeec`.
- Runtime baseline cases 07 and 08 capture Mermaid plus JSON/TypeScript highlighting in dark and light themes.
