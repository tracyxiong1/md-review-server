# Mermaid Focus And Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove pointer-triggered focus rings from the Mermaid large viewer while preserving keyboard focus feedback, and reduce the Mermaid inline preview height by 40px without scaling or covering the diagram.

**Architecture:** `MermaidDiagramViewer` will expose pointer-versus-keyboard close reasons and locally suppress only the pointer-opened initial focus ring. `MermaidBlock` will record the open method and restore trigger focus only for keyboard closes. Mermaid preview density remains a CSS-only change scoped to the existing Mermaid classes.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS, Vite

---

## File Structure

- Modify `src/components/MermaidDiagramViewer.tsx`: define the input-method contract, report close reasons, and mark the pointer-opened initial focus.
- Modify `src/components/MermaidDiagramViewer.test.tsx`: cover pointer and keyboard focus behavior plus close-button and backdrop reasons.
- Modify `src/components/MermaidBlock.tsx`: record the open method and restore the trigger only after keyboard closes.
- Modify `src/components/MermaidBlock.test.tsx`: cover mouse close, `Escape`, and keyboard activation end to end.
- Modify `src/styles/markdown.css`: add the local focus-ring suppression selector and compact Mermaid preview spacing.
- Create `src/styles/markdown.test.ts`: lock the Mermaid-only spacing and focus selector values.
- Refresh `design-drafts/runtime-baseline/07-*`, `08-*`, and their entries in `cases.json`: capture the shipped dark/light Mermaid surface.
- Create both active draft `DECISION.md` files, then archive the completed draft folders.

### Task 1: Viewer Input-Method Contract

**Files:**

- Modify: `src/components/MermaidDiagramViewer.test.tsx`
- Modify: `src/components/MermaidDiagramViewer.tsx`
- Modify: `src/styles/markdown.css`

- [ ] **Step 1: Write failing tests for keyboard and pointer close reasons**

Update every viewer render to pass `initialFocusMethod="keyboard"`, then replace the first two close tests and add pointer-focus and backdrop coverage:

```tsx
it("renders an accessible dialog and reports Escape as a keyboard close", () => {
  const onClose = vi.fn();
  render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="keyboard"
      onClose={onClose}
    />
  );

  expect(
    screen.getByRole("dialog", { name: "Mermaid 图表查看器" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "关闭大图" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledWith("keyboard");
});

it("reports a mouse click on the close button as a pointer close", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const { unmount } = render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="pointer"
      onClose={onClose}
    />
  );

  expect(document.body).toHaveStyle({ overflow: "hidden" });
  await user.click(screen.getByRole("button", { name: "关闭大图" }));
  expect(onClose).toHaveBeenCalledWith("pointer");

  unmount();
  expect(document.body.style.overflow).toBe("");
});

it("reports keyboard activation of the close button as a keyboard close", () => {
  const onClose = vi.fn();
  render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="keyboard"
      onClose={onClose}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "关闭大图" }), {
    detail: 0
  });
  expect(onClose).toHaveBeenCalledWith("keyboard");
});

it("reports a backdrop click as a pointer close", () => {
  const onClose = vi.fn();
  const { container } = render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="pointer"
      onClose={onClose}
    />
  );
  const backdrop = container.ownerDocument.querySelector(
    ".mermaid-viewer-backdrop"
  );

  expect(backdrop).not.toBeNull();
  fireEvent.mouseDown(backdrop!);
  expect(onClose).toHaveBeenCalledWith("pointer");
});

it("suppresses only the pointer-opened initial focus ring", () => {
  render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="pointer"
      onClose={vi.fn()}
    />
  );
  const closeButton = screen.getByRole("button", { name: "关闭大图" });

  expect(closeButton).toHaveFocus();
  expect(closeButton).toHaveAttribute("data-suppress-focus-ring", "true");

  fireEvent.keyDown(closeButton, { key: "Tab" });
  expect(closeButton).toHaveAttribute("data-suppress-focus-ring", "false");
});
```

- [ ] **Step 2: Run the viewer test to verify RED**

Run:

```bash
pnpm test src/components/MermaidDiagramViewer.test.tsx
```

Expected: FAIL because `initialFocusMethod` and the close-reason argument do not exist.

- [ ] **Step 3: Implement the input-method contract**

Add the type and props:

```tsx
export type ViewerInputMethod = "keyboard" | "pointer";

interface MermaidDiagramViewerProps {
  svg: string;
  initialFocusMethod: ViewerInputMethod;
  onClose: (method: ViewerInputMethod) => void;
}
```

Initialize and clear the local suppression state:

```tsx
export const MermaidDiagramViewer = ({
  svg,
  initialFocusMethod,
  onClose,
}: MermaidDiagramViewerProps) => {
  const [suppressInitialFocusRing, setSuppressInitialFocusRing] = useState(
    initialFocusMethod === 'pointer',
  );
```

Report keyboard Escape from the document handler:

```tsx
if (event.key === "Escape") {
  event.preventDefault();
  onClose("keyboard");
}
```

Report pointer backdrop close and clear suppression when keyboard input reaches the dialog:

```tsx
<div
  className="mermaid-viewer-backdrop"
  onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose('pointer');
  }}
>
  <section
    className="mermaid-viewer"
    role="dialog"
    aria-modal="true"
    aria-label="Mermaid 图表查看器"
    onKeyDownCapture={() => setSuppressInitialFocusRing(false)}
  >
```

Report the close-button method from native click detail and expose the suppression state:

```tsx
<button
  ref={closeRef}
  type="button"
  aria-label="关闭大图"
  data-suppress-focus-ring={suppressInitialFocusRing}
  onClick={(event) => onClose(event.detail === 0 ? "keyboard" : "pointer")}
>
  ×
</button>
```

Add the scoped CSS override immediately after the existing toolbar focus rule:

```css
.mermaid-viewer-toolbar button[data-suppress-focus-ring="true"]:focus-visible {
  outline: none;
}
```

- [ ] **Step 4: Update remaining viewer renders and verify GREEN**

Pass `initialFocusMethod="keyboard"` to every remaining `MermaidDiagramViewer` render in the test file, then run:

```bash
pnpm test src/components/MermaidDiagramViewer.test.tsx
```

Expected: all viewer tests PASS.

- [ ] **Step 5: Commit the viewer protocol**

```bash
git add src/components/MermaidDiagramViewer.tsx src/components/MermaidDiagramViewer.test.tsx src/styles/markdown.css
git commit -m "fix: preserve mermaid viewer input modality"
```

### Task 2: Trigger Focus Restoration

**Files:**

- Modify: `src/components/MermaidBlock.test.tsx`
- Modify: `src/components/MermaidBlock.tsx`

- [ ] **Step 1: Replace the unconditional-focus test with pointer and keyboard cases**

Replace the existing large-view test and add keyboard-close coverage:

```tsx
it("opens from a mouse click without restoring trigger focus after mouse close", async () => {
  const user = userEvent.setup();
  vi.mocked(mermaid.render).mockResolvedValue({
    svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
    diagramType: "sequence"
  });
  render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

  const trigger = await screen.findByRole("button", {
    name: "放大查看 Mermaid 图表"
  });
  expect(trigger).toHaveAttribute("title", "放大查看");
  expect(trigger).toHaveTextContent("");
  expect(trigger.querySelector("svg")).toBeInTheDocument();

  await user.click(trigger);
  const closeButton = screen.getByRole("button", { name: "关闭大图" });
  expect(closeButton).toHaveAttribute("data-suppress-focus-ring", "true");

  await user.click(closeButton);
  await waitFor(() => {
    expect(
      screen.queryByRole("dialog", { name: "Mermaid 图表查看器" })
    ).not.toBeInTheDocument();
  });
  expect(trigger).not.toHaveFocus();
});

it("restores trigger focus after Escape", async () => {
  const user = userEvent.setup();
  vi.mocked(mermaid.render).mockResolvedValue({
    svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
    diagramType: "sequence"
  });
  render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

  const trigger = await screen.findByRole("button", {
    name: "放大查看 Mermaid 图表"
  });
  await user.click(trigger);
  fireEvent.keyDown(document, { key: "Escape" });

  await waitFor(() => expect(trigger).toHaveFocus());
});

it("keeps visible focus semantics for keyboard open and close", async () => {
  const user = userEvent.setup();
  vi.mocked(mermaid.render).mockResolvedValue({
    svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
    diagramType: "sequence"
  });
  render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

  const trigger = await screen.findByRole("button", {
    name: "放大查看 Mermaid 图表"
  });
  trigger.focus();
  fireEvent.click(trigger, { detail: 0 });

  const closeButton = screen.getByRole("button", { name: "关闭大图" });
  expect(closeButton).toHaveFocus();
  expect(closeButton).toHaveAttribute("data-suppress-focus-ring", "false");

  fireEvent.click(closeButton, { detail: 0 });
  await waitFor(() => expect(trigger).toHaveFocus());
});
```

Add `fireEvent` to the Testing Library import.

- [ ] **Step 2: Run the block test to verify RED**

Run:

```bash
pnpm test src/components/MermaidBlock.test.tsx
```

Expected: FAIL because mouse close still restores the trigger and the viewer props do not receive an open method.

- [ ] **Step 3: Implement open-method state and conditional restoration**

Import the shared type:

```tsx
import {
  MermaidDiagramViewer,
  type ViewerInputMethod
} from "./MermaidDiagramViewer";
```

Replace the boolean viewer state:

```tsx
const [viewerOpenMethod, setViewerOpenMethod] =
  useState<ViewerInputMethod | null>(null);
```

Replace `closeViewer`:

```tsx
const closeViewer = (method: ViewerInputMethod) => {
  setViewerOpenMethod(null);
  if (method === "keyboard") expandButtonRef.current?.focus();
};
```

Record the input method on the trigger:

```tsx
onClick={(event) => {
  setViewerOpenMethod(event.detail === 0 ? 'keyboard' : 'pointer');
}}
```

Replace the existing viewer child inside the `.mermaid-block` return with this conditional JSX child.

<!-- prettier-ignore -->
```tsx
{viewerOpenMethod && (
  <MermaidDiagramViewer
    svg={svg}
    initialFocusMethod={viewerOpenMethod}
    onClose={closeViewer}
  />
)}
```

- [ ] **Step 4: Run the focused component tests and verify GREEN**

```bash
pnpm test src/components/MermaidBlock.test.tsx src/components/MermaidDiagramViewer.test.tsx
```

Expected: both test files PASS.

- [ ] **Step 5: Commit trigger focus behavior**

```bash
git add src/components/MermaidBlock.tsx src/components/MermaidBlock.test.tsx
git commit -m "fix: restore mermaid trigger focus for keyboard closes"
```

### Task 3: Compact Inline Preview Spacing

**Files:**

- Create: `src/styles/markdown.test.ts`
- Modify: `src/styles/markdown.css`

- [ ] **Step 1: Write a failing CSS contract test**

Create `src/styles/markdown.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./markdown.css", import.meta.url), "utf8");

describe("Mermaid preview styles", () => {
  it("uses compact vertical spacing without changing horizontal padding", () => {
    expect(css).toMatch(
      /\.mermaid-pre\s*{[^}]*--markdown-pre-padding:\s*36px 16px 4px;/s
    );
    expect(css).toMatch(/\.mermaid-container\s*{[^}]*padding:\s*8px 16px;/s);
    expect(css).toMatch(/\.mermaid-expand-button\s*{[^}]*top:\s*4px;/s);
  });

  it("suppresses only the explicitly marked viewer focus ring", () => {
    expect(css).toMatch(
      /\.mermaid-viewer-toolbar button\[data-suppress-focus-ring=(["'])true\1\]:focus-visible\s*{[^}]*outline:\s*none;/s
    );
  });
});
```

- [ ] **Step 2: Run the style test to verify RED**

```bash
pnpm test src/styles/markdown.test.ts
```

Expected: the compact-spacing test FAILS with the current `48px 16px 16px`, `1rem`, and `top: 12px` values.

- [ ] **Step 3: Apply the compact 4px-grid spacing**

Update the Mermaid rules:

```css
.mermaid-pre {
  --markdown-pre-padding: 36px 16px 4px;

  position: relative;
}

.mermaid-container {
  display: flex;
  justify-content: center;
  margin: 0;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-secondary);
  overflow-x: auto;
}

.mermaid-expand-button {
  position: absolute;
  top: 4px;
  right: 12px;
```

Do not change button dimensions, horizontal padding, SVG dimensions, border, radius, or colors.

- [ ] **Step 4: Run the style and component tests and verify GREEN**

```bash
pnpm test src/styles/markdown.test.ts src/components/MermaidBlock.test.tsx src/components/MermaidDiagramViewer.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 5: Commit compact preview spacing**

```bash
git add src/styles/markdown.css src/styles/markdown.test.ts
git commit -m "style: compact mermaid preview spacing"
```

### Task 4: Runtime Baseline And Final Verification

**Files:**

- Modify: `design-drafts/runtime-baseline/07-dark-color-compatibility.png`
- Modify: `design-drafts/runtime-baseline/08-light-color-compatibility.png`
- Modify: `design-drafts/runtime-baseline/html/07-dark-color-compatibility.html`
- Modify: `design-drafts/runtime-baseline/html/08-light-color-compatibility.html`
- Modify: `design-drafts/runtime-baseline/fragments/07-dark-color-compatibility.root.html`
- Modify: `design-drafts/runtime-baseline/fragments/08-light-color-compatibility.root.html`
- Modify: `design-drafts/runtime-baseline/cases.json`
- Create: `design-drafts/active/2026-07-14-mermaid-viewer-focus/DECISION.md`
- Create: `design-drafts/active/2026-07-14-mermaid-preview-density/DECISION.md`

- [ ] **Step 1: Run the full automated verification**

```bash
pnpm test
pnpm lint
pnpm fmt:check
pnpm build
```

Expected: every command exits 0 with no test, lint, formatting, or TypeScript errors.

- [ ] **Step 2: Start the runtime-baseline fixture**

Terminal 1:

```bash
BASE_DIR="$PWD/design-drafts/runtime-baseline/fixture" \
REVIEW_DIR="$PWD/design-drafts/runtime-baseline/fixture/reviews" \
API_PORT=3130 \
node server/index.js
```

Terminal 2:

```bash
API_PORT=3130 VITE_PORT=6160 ./node_modules/.bin/vite --host 127.0.0.1
```

- [ ] **Step 3: Verify focus behavior in the running browser**

Open `http://127.0.0.1:6160/?file=docs%2Fcolor-compatibility.md` and verify:

1. Mouse-opened viewer: close button owns DOM focus and has no visible outline.
2. Mouse close button: viewer closes and the expand trigger has no visible outline.
3. Mouse backdrop close: viewer closes and the expand trigger has no visible outline.
4. Keyboard-opened viewer: close button has the existing blue focus outline.
5. `Escape` close: expand trigger regains focus with the existing blue outline.
6. Keyboard activation of close: expand trigger regains focus with the existing blue outline.

- [ ] **Step 4: Verify and capture compact dark/light preview states**

At a `1280×720` viewport, recapture cases 07 and 08. Preserve the existing filenames and replace their screenshot, frozen full-page HTML, and `#root` fragment artifacts. Update only the matching `cases.json` metrics.

Expected layout measurements for each Mermaid preview:

- Outer top-to-SVG spacing: approximately `44px` including both scoped padding layers.
- SVG-to-outer-bottom spacing: approximately `12px` including both scoped padding layers.
- SVG width and height: unchanged from the current baseline.
- First Mermaid SVG y-position: approximately 20px earlier than the current case.
- Second Mermaid SVG y-position: approximately 60px earlier because both preceding compact blocks contribute to document flow.

- [ ] **Step 5: Write decisions and archive active design drafts**

Each `DECISION.md` must include `Final Direction`, `Verification`, `Landed In`, and `Baseline Updated`. Record the actual test counts and runtime measurements from Steps 1 through 4.

Move the completed folders:

```bash
mv design-drafts/active/2026-07-14-mermaid-viewer-focus \
  design-drafts/archive/2026-07-14-mermaid-viewer-focus
mv design-drafts/active/2026-07-14-mermaid-preview-density \
  design-drafts/archive/2026-07-14-mermaid-preview-density
```

- [ ] **Step 6: Check the final diff and commit verification artifacts**

```bash
git diff --check
git status --short
git add design-drafts/runtime-baseline design-drafts/archive
git commit -m "docs: refresh mermaid runtime baseline"
```

Expected: only the two Mermaid baseline cases, `cases.json`, and the two archived decision folders are included in this commit.
