# Codex Color Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mermaid diagrams and fenced code blocks readable in Codex light and dark modes without changing diagram sizing behavior.

**Architecture:** Centralize the approved Mermaid light/dark `themeVariables` beside `MermaidBlock`, keep Mermaid's `base` theme and strict security mode, and choose the palette from `useDarkMode`. Replace the two competing highlight.js stylesheet imports and ineffective link-toggle effect with one light base theme plus `.dark-mode`-scoped token overrides in the existing Markdown stylesheet.

**Tech Stack:** React 19, TypeScript, Mermaid 11, highlight.js 11, Vitest, Testing Library, CSS.

---

### Task 1: Lock Mermaid palette behavior with tests

**Files:**

- Modify: `src/components/MermaidBlock.test.tsx`
- Modify: `src/components/MermaidBlock.tsx`

- [ ] **Step 1: Write a failing light-theme test**

Add an assertion that `mermaid.initialize` receives `theme: 'base'` and a light `themeVariables` object whose `primaryTextColor`, `lineColor`, `actorTextColor`, `signalTextColor`, and `labelTextColor` use readable neutral colors.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/components/MermaidBlock.test.tsx`

Expected: FAIL because the component still initializes Mermaid with `theme: 'default'` and no explicit variables.

- [ ] **Step 3: Add a failing dark-theme test**

Make the dark-mode mock mutable, rerender in dark mode, and assert the corresponding dark neutral variables, including diagram background, node text, actor text, signal text, label text, note text, and line colors.

- [ ] **Step 4: Implement the minimal palette selection**

Define exported light and dark Mermaid theme-variable objects in `MermaidBlock.tsx`, select one using `isDark`, and initialize with:

```ts
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: isDark
    ? darkMermaidThemeVariables
    : lightMermaidThemeVariables,
  securityLevel: "strict"
});
```

Do not touch SVG sizing or container overflow.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm test -- src/components/MermaidBlock.test.tsx`

Expected: all MermaidBlock tests pass.

### Task 2: Make syntax highlighting theme-safe

**Files:**

- Modify: `src/components/MarkdownPreview.tsx`
- Modify: `src/styles/markdown.css`
- Modify: `src/components/MarkdownPreview.test.tsx`
- Modify: `src/hooks/useDarkMode.ts`
- Modify: `src/hooks/useDarkMode.test.ts`

- [ ] **Step 1: Write a failing source-level regression test**

Add a test that verifies theme changes are represented by the app's `.dark-mode` root class and do not depend on dynamically disabling `<link>` elements. The component must render highlighted Markdown without injecting or toggling highlight theme links.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/components/MarkdownPreview.test.tsx`

Expected: FAIL while the obsolete link-toggle effect remains part of the component behavior asserted by the regression test.

- [ ] **Step 3: Remove competing theme behavior**

Keep only the light `github.css` import in `MarkdownPreview.tsx` and delete the effect that queries `github.css` and `github-dark.css` link tags.

- [ ] **Step 4: Add scoped dark syntax tokens**

In `src/styles/markdown.css`, add `.dark-mode .hljs` and token selectors for comments, punctuation, properties, tags, strings, numbers, literals, keywords, types, functions, and additions/deletions. Use neutral high-contrast colors and keep the existing code background token.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm test -- src/components/MarkdownPreview.test.tsx`

Expected: all MarkdownPreview tests pass.

- [ ] **Step 6: Keep separate theme consumers synchronized**

Add a failing hook test with two `useDarkMode` consumers, then broadcast explicit theme changes so an already-rendered Mermaid block redraws immediately after the theme button changes the app theme.

### Task 3: Document the decision and refresh visual evidence

**Files:**

- Create: `design-drafts/active/2026-07-11-codex-color-compatibility/DECISION.md`
- Refresh: `design-drafts/runtime-baseline/`
- Move: `design-drafts/active/2026-07-11-codex-color-compatibility/` to `design-drafts/archive/2026-07-11-codex-color-compatibility/`

- [ ] **Step 1: Run the app against a Markdown fixture containing sequence, flowchart, JSON, and TypeScript blocks**

Use the normal dev server and inspect both themes. Keep viewport dimensions stable so only color changes are evaluated.

- [ ] **Step 2: Verify the approved states**

Confirm readable Mermaid actors/messages/labels/lines in dark mode, readable code tokens in light mode, and no width/height behavior changes. Also inspect table, image, blockquote, Diff, inline-code, and Mermaid error fallback for unintended color regressions.

- [ ] **Step 3: Refresh runtime artifacts**

Recapture the affected runtime baseline screenshots, frozen full-page HTML, root fragments, and DOM metrics following `design-drafts/runtime-baseline/README.md`.

- [ ] **Step 4: Record and archive the decision**

Write `DECISION.md` with the selected palette, implementation boundaries, verification results, and deferred sizing question, then move the completed draft folder to the archive.

### Task 4: Full verification and release

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Run full verification**

Run:

```bash
pnpm test
pnpm lint
pnpm fmt:check
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Review the diff against the approved scope**

Run: `git diff --check && git diff --stat && git status --short`

Expected: no whitespace errors; only palette, tests, design records, runtime evidence, and release metadata are changed.

- [ ] **Step 3: Create the patch release commit**

Bump `0.5.1` to `0.5.2`, update the lockfile, commit the scoped changes, push `main`, publish the npm patch version using the repository's established release flow, and verify the remote tag/package version.
