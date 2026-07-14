# Mermaid Focus Return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the Mermaid expand trigger after every viewer close without showing pointer-origin focus rings, while preserving keyboard feedback and enforcing modal focus boundaries.

**Architecture:** `MermaidDiagramViewer` owns the viewer-session input modality, close reason, background inert state, and toolbar focus loop. `MermaidBlock` owns trigger focus restoration and the one-shot return-focus visual suppression state. CSS separates hover feedback from unsuppressed keyboard focus feedback.

**Tech Stack:** React 19, TypeScript, Testing Library, Vitest, CSS, Vite

---

## File Map

- Modify `src/components/MermaidDiagramViewer.tsx`: session modality, structured close event, `inert`, and toolbar focus loop.
- Modify `src/components/MermaidDiagramViewer.test.tsx`: close-event, mixed-input, `inert`, and focus-loop coverage.
- Modify `src/components/MermaidBlock.tsx`: layout-phase trigger focus restoration and return-focus suppression state.
- Modify `src/components/MermaidBlock.test.tsx`: pointer, keyboard, backdrop, and mixed-input return-focus coverage.
- Modify `src/styles/markdown.css`: split hover and focus selectors; suppress only the one-shot return focus.
- Modify `src/styles/markdown.test.ts`: CSS contract tests for the trigger suppression selector.
- Create `design-drafts/active/2026-07-14-mermaid-focus-return/DECISION.md`, then archive the requirement folder after runtime verification.

### Task 1: Structured Close Events And Session Input Modality

**Files:**

- Modify: `src/components/MermaidDiagramViewer.test.tsx:23-95`
- Modify: `src/components/MermaidDiagramViewer.tsx:20-26,45-60,101-123,203-247`
- Modify: `src/components/MermaidBlock.tsx:1-4,137-170`

- [ ] **Step 1: Replace close-method expectations with structured close-event expectations**

Update the existing viewer tests to expect the following payloads:

```tsx
fireEvent.keyDown(document, { key: "Escape" });
expect(onClose).toHaveBeenCalledWith({
  reason: "escape",
  inputMethod: "keyboard"
});

await user.click(screen.getByRole("button", { name: "关闭大图" }));
expect(onClose).toHaveBeenCalledWith({
  reason: "close-button",
  inputMethod: "pointer"
});

fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
expect(onClose).toHaveBeenCalledWith({
  reason: "backdrop",
  inputMethod: "pointer"
});
```

Add tests for the two mixed-input transitions:

```tsx
it("keeps pointer modality when Escape is the first key after pointer open", () => {
  const onClose = vi.fn();
  render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="pointer"
      onClose={onClose}
    />
  );

  fireEvent.keyDown(document, { key: "Escape" });

  expect(onClose).toHaveBeenCalledWith({
    reason: "escape",
    inputMethod: "pointer"
  });
});

it("switches to keyboard modality after keyboard navigation", () => {
  const onClose = vi.fn();
  render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="pointer"
      onClose={onClose}
    />
  );

  fireEvent.keyDown(screen.getByRole("button", { name: "关闭大图" }), {
    key: "Tab"
  });
  fireEvent.keyDown(document, { key: "Escape" });

  expect(onClose).toHaveBeenCalledWith({
    reason: "escape",
    inputMethod: "keyboard"
  });
});

it("switches back to pointer modality after pointer interaction", () => {
  const onClose = vi.fn();
  render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="keyboard"
      onClose={onClose}
    />
  );

  fireEvent.pointerDown(screen.getByTestId("mermaid-viewer-viewport"), {
    button: 0,
    pointerId: 1,
    clientX: 100,
    clientY: 100
  });
  fireEvent.keyDown(document, { key: "Escape" });

  expect(onClose).toHaveBeenCalledWith({
    reason: "escape",
    inputMethod: "pointer"
  });
});
```

- [ ] **Step 2: Run the viewer tests and verify RED**

Run:

```bash
pnpm exec vitest run src/components/MermaidDiagramViewer.test.tsx
```

Expected: FAIL because `onClose` still receives a string and `Escape` always reports `keyboard`.

- [ ] **Step 3: Add the close-event type and session modality ref**

Replace the close callback type with:

```tsx
export type ViewerInputMethod = "keyboard" | "pointer";
export type ViewerCloseReason = "escape" | "close-button" | "backdrop";

export interface ViewerCloseEvent {
  reason: ViewerCloseReason;
  inputMethod: ViewerInputMethod;
}

interface MermaidDiagramViewerProps {
  svg: string;
  initialFocusMethod: ViewerInputMethod;
  onClose: (event: ViewerCloseEvent) => void;
}
```

Add the session modality ref beside the existing refs:

```tsx
const interactionMethodRef = useRef<ViewerInputMethod>(initialFocusMethod);
```

Add the key classification helper above the component:

```tsx
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

const isEffectiveKeyboardInput = (event: React.KeyboardEvent<HTMLElement>) =>
  event.key !== "Escape" && !MODIFIER_KEYS.has(event.key);
```

- [ ] **Step 4: Report current session modality from every close path**

Change the document Escape handler to:

```tsx
if (event.key === "Escape") {
  event.preventDefault();
  onClose({
    reason: "escape",
    inputMethod: interactionMethodRef.current
  });
}
```

Add capture handlers to the dialog:

```tsx
onKeyDownCapture={(event) => {
  if (isEffectiveKeyboardInput(event)) {
    interactionMethodRef.current = 'keyboard';
    setSuppressInitialFocusRing(false);
  }
}}
onPointerDownCapture={() => {
  interactionMethodRef.current = 'pointer';
}}
```

Update the close button and backdrop handlers:

```tsx
onMouseDown={(event) => {
  if (event.target === event.currentTarget) {
    interactionMethodRef.current = 'pointer';
    onClose({ reason: 'backdrop', inputMethod: 'pointer' });
  }
}}
```

```tsx
onClick={(event) => {
  const inputMethod = event.detail === 0 ? 'keyboard' : 'pointer';
  interactionMethodRef.current = inputMethod;
  onClose({ reason: 'close-button', inputMethod });
}}
```

Set pointer modality at the start of `handleWheel` so wheel interaction followed by Escape remains a pointer path:

```tsx
interactionMethodRef.current = "pointer";
event.preventDefault();
```

Temporarily adapt `MermaidBlock` so it compiles before Task 2:

```tsx
import {
  MermaidDiagramViewer,
  type ViewerCloseEvent,
  type ViewerInputMethod
} from "./MermaidDiagramViewer";

const closeViewer = ({ reason, inputMethod }: ViewerCloseEvent) => {
  setViewerOpenMethod(null);
  if (reason === "escape" || inputMethod === "keyboard") {
    expandButtonRef.current?.focus();
  }
};
```

- [ ] **Step 5: Run the viewer and block tests and verify GREEN**

Run:

```bash
pnpm exec vitest run src/components/MermaidDiagramViewer.test.tsx src/components/MermaidBlock.test.tsx
```

Expected: both test files pass.

- [ ] **Step 6: Commit the session modality change**

```bash
git add src/components/MermaidDiagramViewer.tsx src/components/MermaidDiagramViewer.test.tsx src/components/MermaidBlock.tsx
git commit -m "fix: track Mermaid viewer interaction modality"
```

### Task 2: Restore Trigger Focus Without Pointer-Origin Highlight

**Files:**

- Modify: `src/components/MermaidBlock.test.tsx:90-149`
- Modify: `src/components/MermaidBlock.tsx:1-4,86-174`
- Modify: `src/styles/markdown.test.ts:10-33`
- Modify: `src/styles/markdown.css:1728-1738`

- [ ] **Step 1: Add failing focus-return tests for pointer close paths**

Replace the mouse-close assertion with:

```tsx
await user.click(closeButton);

expect(
  screen.queryByRole("dialog", { name: "Mermaid 图表查看器" })
).not.toBeInTheDocument();
expect(trigger).toHaveFocus();
expect(trigger).toHaveAttribute("data-suppress-focus-ring", "true");
```

Extend the pointer-open Escape test:

```tsx
fireEvent.keyDown(document, { key: "Escape" });

expect(
  screen.queryByRole("dialog", { name: "Mermaid 图表查看器" })
).not.toBeInTheDocument();
expect(trigger).toHaveFocus();
expect(trigger).toHaveAttribute("data-suppress-focus-ring", "true");
```

Add a backdrop close test:

```tsx
it("silently restores trigger focus after backdrop close", async () => {
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
  const dialog = screen.getByRole("dialog", { name: "Mermaid 图表查看器" });

  fireEvent.mouseDown(dialog.parentElement!);

  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("data-suppress-focus-ring", "true");
});
```

Add a mixed-input assertion:

```tsx
it("shows return focus after pointer open followed by keyboard navigation", async () => {
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
  fireEvent.keyDown(screen.getByRole("button", { name: "关闭大图" }), {
    key: "Tab"
  });
  fireEvent.keyDown(document, { key: "Escape" });

  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("data-suppress-focus-ring", "false");
});
```

- [ ] **Step 2: Run the block tests and verify RED**

Run:

```bash
pnpm exec vitest run src/components/MermaidBlock.test.tsx
```

Expected: FAIL because pointer closes still leave focus on `BODY` and the trigger has no suppression attribute.

- [ ] **Step 3: Restore trigger focus in a layout effect**

Import `useLayoutEffect` and add the parent state:

```tsx
const [returnFocusMethod, setReturnFocusMethod] =
  useState<ViewerInputMethod | null>(null);
const restoreFocusAfterCloseRef = useRef(false);
```

Add the layout effect before the error return:

```tsx
useLayoutEffect(() => {
  if (!restoreFocusAfterCloseRef.current || viewerOpenMethod !== null) {
    return;
  }

  restoreFocusAfterCloseRef.current = false;
  expandButtonRef.current?.focus({ preventScroll: true });
}, [returnFocusMethod, viewerOpenMethod]);
```

Replace the close handler and add an open helper:

```tsx
const closeViewer = ({ inputMethod }: ViewerCloseEvent) => {
  restoreFocusAfterCloseRef.current = true;
  setReturnFocusMethod(inputMethod);
  setViewerOpenMethod(null);
};

const openViewer = (inputMethod: ViewerInputMethod) => {
  setReturnFocusMethod(null);
  setViewerOpenMethod(inputMethod);
};
```

Update the trigger props:

```tsx
data-suppress-focus-ring={returnFocusMethod === 'pointer'}
onBlur={() => setReturnFocusMethod(null)}
onKeyDownCapture={() => setReturnFocusMethod(null)}
onClick={(event) => openViewer(event.detail === 0 ? 'keyboard' : 'pointer')}
```

- [ ] **Step 4: Add CSS contract tests before changing styles**

Add this test to `src/styles/markdown.test.ts`:

```ts
it("suppresses only pointer-origin return focus on the expand trigger", () => {
  expect(stylesheet).toMatch(
    /^[ \t]*\.mermaid-expand-button:focus-visible:not\(\[data-suppress-focus-ring='true'\]\)\s*\{[^}]*outline:\s*2px solid var\(--link-color\);/ms
  );
  expect(stylesheet).toMatch(
    /^[ \t]*\.mermaid-expand-button\[data-suppress-focus-ring='true'\]:focus-visible\s*\{[^}]*outline:\s*none;/ms
  );
});
```

Run:

```bash
pnpm exec vitest run src/styles/markdown.test.ts
```

Expected: FAIL because the trigger has no scoped suppression selector.

- [ ] **Step 5: Split hover and focus-visible styling**

Replace the combined trigger selectors with:

```css
.mermaid-expand-button:hover,
.mermaid-expand-button:focus-visible:not([data-suppress-focus-ring="true"]) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  opacity: 1;
}

.mermaid-expand-button:focus-visible:not([data-suppress-focus-ring="true"]) {
  outline: 2px solid var(--link-color);
  outline-offset: 2px;
}

.mermaid-expand-button[data-suppress-focus-ring="true"]:focus-visible {
  outline: none;
}
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
pnpm exec vitest run src/components/MermaidBlock.test.tsx src/components/MermaidDiagramViewer.test.tsx src/styles/markdown.test.ts
```

Expected: all focused tests pass; pointer closes restore real focus with `data-suppress-focus-ring="true"`.

- [ ] **Step 7: Commit trigger focus restoration**

```bash
git add src/components/MermaidBlock.tsx src/components/MermaidBlock.test.tsx src/styles/markdown.css src/styles/markdown.test.ts
git commit -m "fix: restore Mermaid trigger focus without pointer highlight"
```

### Task 3: Enforce Modal Focus Boundaries

**Files:**

- Modify: `src/components/MermaidDiagramViewer.test.tsx:8-184`
- Modify: `src/components/MermaidDiagramViewer.tsx:1-8,45-60,101-123,203-274`

- [ ] **Step 1: Add failing `inert` lifecycle tests**

Add the following tests:

```tsx
it("makes the app root inert while the modal is mounted and restores it on unmount", () => {
  const appRoot = document.createElement("div");
  appRoot.id = "root";
  document.body.appendChild(appRoot);

  const { unmount } = render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="pointer"
      onClose={vi.fn()}
    />
  );

  expect(appRoot.inert).toBe(true);
  unmount();
  expect(appRoot.inert).toBe(false);
  appRoot.remove();
});

it("restores a pre-existing inert app root state", () => {
  const appRoot = document.createElement("div");
  appRoot.id = "root";
  appRoot.inert = true;
  document.body.appendChild(appRoot);

  const { unmount } = render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="pointer"
      onClose={vi.fn()}
    />
  );
  unmount();

  expect(appRoot.inert).toBe(true);
  appRoot.remove();
});
```

- [ ] **Step 2: Add failing toolbar focus-loop tests**

Add the boundary tests:

```tsx
it("wraps Tab from the last toolbar button to the first enabled button", () => {
  render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="keyboard"
      onClose={vi.fn()}
    />
  );
  const closeButton = screen.getByRole("button", { name: "关闭大图" });
  const zoomOutButton = screen.getByRole("button", { name: "缩小图表" });

  fireEvent.keyDown(closeButton, { key: "Tab" });

  expect(zoomOutButton).toHaveFocus();
});

it("wraps Shift+Tab from the first enabled button to close", () => {
  render(
    <MermaidDiagramViewer
      svg={svg}
      initialFocusMethod="keyboard"
      onClose={vi.fn()}
    />
  );
  const closeButton = screen.getByRole("button", { name: "关闭大图" });
  const zoomOutButton = screen.getByRole("button", { name: "缩小图表" });
  act(() => zoomOutButton.focus());

  fireEvent.keyDown(zoomOutButton, { key: "Tab", shiftKey: true });

  expect(closeButton).toHaveFocus();
});

it("skips a disabled first toolbar button when wrapping focus", () => {
  const oversizedSvg =
    '<svg viewBox="0 0 4000 3000"><text>diagram</text></svg>';
  render(
    <MermaidDiagramViewer
      svg={oversizedSvg}
      initialFocusMethod="keyboard"
      onClose={vi.fn()}
    />
  );
  const closeButton = screen.getByRole("button", { name: "关闭大图" });
  const zoomOutButton = screen.getByRole("button", { name: "缩小图表" });
  const fitButton = screen.getByRole("button", {
    name: "当前比例，点击适应窗口"
  });
  expect(zoomOutButton).toBeDisabled();

  fireEvent.keyDown(closeButton, { key: "Tab" });

  expect(fitButton).toHaveFocus();
});
```

- [ ] **Step 3: Run the viewer tests and verify RED**

Run:

```bash
pnpm exec vitest run src/components/MermaidDiagramViewer.test.tsx
```

Expected: FAIL because `#root` remains interactive and `Tab` is not wrapped.

- [ ] **Step 4: Add the app-root inert lifecycle in a layout effect**

Import `useLayoutEffect` and add a dedicated layout effect. Its cleanup must run before the parent layout effect restores trigger focus:

```tsx
useLayoutEffect(() => {
  const appRoot = document.getElementById("root");
  const previousRootInert = appRoot?.inert ?? false;
  if (appRoot) {
    appRoot.inert = true;
  }

  return () => {
    if (appRoot) {
      appRoot.inert = previousRootInert;
    }
  };
}, []);
```

Keep body overflow, initial close-button focus, Escape handling, and resize handling in the existing passive effect.

- [ ] **Step 5: Add a toolbar ref and focus-loop helper**

Add the toolbar ref:

```tsx
const toolbarRef = useRef<HTMLDivElement>(null);
```

Add the focus-loop helper inside the component:

```tsx
const wrapToolbarFocus = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key !== "Tab") return;

  const buttons = Array.from(
    toolbarRef.current?.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)"
    ) ?? []
  );
  const firstButton = buttons[0];
  const lastButton = buttons.at(-1);
  if (!firstButton || !lastButton) return;

  if (event.shiftKey && document.activeElement === firstButton) {
    event.preventDefault();
    lastButton.focus();
  } else if (!event.shiftKey && document.activeElement === lastButton) {
    event.preventDefault();
    firstButton.focus();
  }
};
```

Call it from the dialog key capture handler after updating keyboard modality:

```tsx
if (isEffectiveKeyboardInput(event)) {
  interactionMethodRef.current = "keyboard";
  setSuppressInitialFocusRing(false);
}
wrapToolbarFocus(event);
```

Attach the ref:

```tsx
<div ref={toolbarRef} className="mermaid-viewer-toolbar" aria-label="图表缩放控件">
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
pnpm exec vitest run src/components/MermaidDiagramViewer.test.tsx src/components/MermaidBlock.test.tsx
```

Expected: all viewer and block tests pass; `#root` inert state is restored after unmount.

- [ ] **Step 7: Commit modal focus containment**

```bash
git add src/components/MermaidDiagramViewer.tsx src/components/MermaidDiagramViewer.test.tsx
git commit -m "fix: contain focus in Mermaid viewer"
```

### Task 4: Runtime Verification And Design Archive

**Files:**

- Create: `design-drafts/active/2026-07-14-mermaid-focus-return/DECISION.md`
- Modify: `design-drafts/active/2026-07-14-mermaid-focus-return/AUDIT.md`
- Create: `design-drafts/active/2026-07-14-mermaid-focus-return/screenshots/09-pointer-escape-fixed.png`
- Create: `design-drafts/active/2026-07-14-mermaid-focus-return/screenshots/10-keyboard-escape-focus.png`
- Move: `design-drafts/active/2026-07-14-mermaid-focus-return/` to `design-drafts/archive/2026-07-14-mermaid-focus-return/`

- [ ] **Step 1: Run the full local verification gates**

Run:

```bash
pnpm test
pnpm lint
pnpm fmt:check
pnpm build
```

Expected: all commands exit with code 0. The existing Vite large-chunk warning and baseline-browser-mapping freshness advisory may remain non-blocking.

- [ ] **Step 2: Start the runtime fixture**

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

Open:

```text
http://127.0.0.1:6160/?file=docs%2Fcolor-compatibility.md
```

- [ ] **Step 3: Verify pointer-origin focus restoration**

Perform the following sequence in light and dark themes:

1. Click the first Mermaid expand button.
2. Press `Escape` without any other keyboard navigation.
3. Confirm the expand trigger is `document.activeElement`.
4. Confirm its computed outline is `none`.
5. Confirm pressing `Tab` resumes ordinary visible keyboard focus.
6. Capture the fixed state as `screenshots/09-pointer-escape-fixed.png`.

Repeat pointer close-button and backdrop close paths and confirm both restore the same trigger without a blue outline.

- [ ] **Step 4: Verify keyboard and focus-loop behavior**

Perform the keyboard sequence:

1. Focus the Mermaid expand button with `Tab` and open it with `Enter`.
2. Confirm the close button receives visible focus.
3. Press `Tab` on close and confirm focus wraps to the first enabled toolbar button.
4. Press `Shift+Tab` there and confirm focus wraps to close.
5. Press `Escape` and confirm the trigger regains visible focus.
6. Capture the final state as `screenshots/10-keyboard-escape-focus.png`.

While the viewer is open, confirm background controls cannot receive focus or pointer interaction.

- [ ] **Step 5: Record the final decision**

Create `DECISION.md` with this final direction:

```md
# Decision: Mermaid 查看器焦点返回

## Final Direction

- 所有关闭路径恢复到对应的放大入口，并使用 `preventScroll` 保持文档位置。
- 指针会话静默恢复焦点；键盘会话保留可见焦点环。
- `Escape` 只关闭查看器，不单独改变会话输入方式。
- 工具栏焦点在可用按钮之间循环，页面根节点在查看器打开期间进入 `inert` 状态。

## Verification

- 指针打开后直接按 `Escape`、点击关闭按钮和点击遮罩均恢复真实焦点且无蓝色 outline。
- 键盘打开、工具栏焦点循环和键盘关闭保留可见焦点反馈。
- 组件测试、完整测试、Lint、格式检查和生产构建全部通过。

## Landed In

- `src/components/MermaidBlock.tsx`
- `src/components/MermaidBlock.test.tsx`
- `src/components/MermaidDiagramViewer.tsx`
- `src/components/MermaidDiagramViewer.test.tsx`
- `src/styles/markdown.css`
- `src/styles/markdown.test.ts`

## Baseline Updated

默认布局和尺寸未变化，现有 07/08 运行时基线保持有效。新增焦点状态截图保存在本归档目录中。
```

Append a resolved section to `AUDIT.md` that links the two new screenshots and records the computed focus states.

- [ ] **Step 6: Archive the completed design requirement**

```bash
mv design-drafts/active/2026-07-14-mermaid-focus-return \
  design-drafts/archive/2026-07-14-mermaid-focus-return
```

Run:

```bash
pnpm exec prettier --check design-drafts/archive/2026-07-14-mermaid-focus-return docs/superpowers/specs/2026-07-14-mermaid-focus-return-design.md docs/superpowers/plans/2026-07-14-mermaid-focus-return.md
git diff --check
```

Expected: both commands exit with code 0.

- [ ] **Step 7: Commit the runtime evidence and decision**

```bash
git add design-drafts/archive/2026-07-14-mermaid-focus-return docs/superpowers/plans/2026-07-14-mermaid-focus-return.md
git commit -m "docs: archive Mermaid focus return decision"
```

- [ ] **Step 8: Confirm the final branch state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -5
```

Expected: the worktree is clean and the branch contains the design, modality, trigger restoration, focus containment, and archived decision commits.
