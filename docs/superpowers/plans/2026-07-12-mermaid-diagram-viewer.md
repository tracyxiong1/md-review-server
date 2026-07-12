# Mermaid Diagram Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible Mermaid lightbox that supports fit-to-window, zooming, mouse drag, trackpad pan, and trackpad pinch without intercepting document scrolling.

**Architecture:** Keep Mermaid rendering in `MermaidBlock` and add a portal-based `MermaidDiagramViewer` for the modal interaction. Isolate transform math in `diagramViewport.ts` so pointer-centered zoom and scale limits are deterministic and unit tested. The viewer owns transient scale, translation, focus, and scroll-lock state; the inline preview remains static.

**Tech Stack:** React 19, TypeScript, React DOM portal, Vitest, Testing Library, CSS

---

## File Structure

- Create `src/lib/diagramViewport.ts`: scale constants and pure fit, clamp, pan, and pointer-centered zoom calculations.
- Create `src/lib/diagramViewport.test.ts`: deterministic unit tests for transform calculations.
- Create `src/components/MermaidDiagramViewer.tsx`: portal dialog, focus restoration, scroll lock, toolbar, and pointer/wheel gestures.
- Create `src/components/MermaidDiagramViewer.test.tsx`: component-level interaction and accessibility tests.
- Modify `src/components/MermaidBlock.tsx`: render the inline expand entry and open the viewer with the rendered SVG.
- Modify `src/components/MermaidBlock.test.tsx`: integration tests for success and error states.
- Modify `src/styles/markdown.css`: inline entry, overlay, canvas, toolbar, interaction, dark theme, responsive, and reduced-motion styles.
- Create `design-drafts/active/2026-07-12-mermaid-diagram-viewer/DECISION.md`: shipped decision and verification record.

### Task 1: Viewport Transform Model

**Files:**

- Create: `src/lib/diagramViewport.ts`
- Test: `src/lib/diagramViewport.test.ts`

- [ ] **Step 1: Write failing tests for scale limits, fit, and pointer-centered zoom**

```ts
import { describe, expect, it } from "vitest";
import { clampScale, fitScale, zoomAtPoint } from "./diagramViewport";

describe("diagramViewport", () => {
  it("clamps scale to the supported 25% to 400% range", () => {
    expect(clampScale(0.1)).toBe(0.25);
    expect(clampScale(2)).toBe(2);
    expect(clampScale(5)).toBe(4);
  });

  it("fits the complete diagram inside the available viewport", () => {
    expect(
      fitScale({ width: 1600, height: 800 }, { width: 800, height: 600 })
    ).toBe(0.5);
  });

  it("keeps the diagram point below the pointer fixed while zooming", () => {
    expect(
      zoomAtPoint(
        { scale: 1, x: 0, y: 0 },
        2,
        { x: 300, y: 200 },
        { x: 100, y: 50 }
      )
    ).toEqual({ scale: 2, x: -200, y: -150 });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/lib/diagramViewport.test.ts`

Expected: FAIL because `./diagramViewport` does not exist.

- [ ] **Step 3: Implement the minimal transform model**

```ts
export const MIN_DIAGRAM_SCALE = 0.25;
export const MAX_DIAGRAM_SCALE = 4;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DiagramTransform extends Point {
  scale: number;
}

export const clampScale = (scale: number) =>
  Math.min(MAX_DIAGRAM_SCALE, Math.max(MIN_DIAGRAM_SCALE, scale));

export const fitScale = (diagram: Size, viewport: Size) =>
  clampScale(
    Math.min(viewport.width / diagram.width, viewport.height / diagram.height)
  );

export const zoomAtPoint = (
  transform: DiagramTransform,
  requestedScale: number,
  pointer: Point,
  viewportOrigin: Point
): DiagramTransform => {
  const scale = clampScale(requestedScale);
  const localPointer = {
    x: pointer.x - viewportOrigin.x,
    y: pointer.y - viewportOrigin.y
  };
  const ratio = scale / transform.scale;

  return {
    scale,
    x: localPointer.x - (localPointer.x - transform.x) * ratio,
    y: localPointer.y - (localPointer.y - transform.y) * ratio
  };
};
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm test -- src/lib/diagramViewport.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the transform model**

```bash
git add src/lib/diagramViewport.ts src/lib/diagramViewport.test.ts
git commit -m "feat: add diagram viewport transforms"
```

### Task 2: Accessible Portal Viewer

**Files:**

- Create: `src/components/MermaidDiagramViewer.tsx`
- Test: `src/components/MermaidDiagramViewer.test.tsx`

- [ ] **Step 1: Write a failing dialog lifecycle test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MermaidDiagramViewer } from "./MermaidDiagramViewer";

const svg = '<svg viewBox="0 0 1600 800"><text>diagram</text></svg>';

describe("MermaidDiagramViewer", () => {
  it("renders an accessible dialog and closes with Escape", async () => {
    const onClose = vi.fn();
    render(<MermaidDiagramViewer svg={svg} onClose={onClose} />);

    expect(
      screen.getByRole("dialog", { name: "Mermaid 图表查看器" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭大图" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MermaidDiagramViewer svg={svg} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "关闭大图" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/components/MermaidDiagramViewer.test.tsx`

Expected: FAIL because `MermaidDiagramViewer` does not exist.

- [ ] **Step 3: Implement the portal, dialog semantics, Escape handler, and scroll lock**

Implement `MermaidDiagramViewer` with this public interface and structure:

```tsx
interface MermaidDiagramViewerProps {
  svg: string;
  onClose: () => void;
}

export const MermaidDiagramViewer = ({
  svg,
  onClose
}: MermaidDiagramViewerProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="mermaid-viewer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="mermaid-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Mermaid 图表查看器"
      >
        <div className="mermaid-viewer-toolbar">
          <button type="button" aria-label="缩小图表">
            −
          </button>
          <button type="button" aria-label="当前比例，点击适应窗口">
            100%
          </button>
          <button type="button" aria-label="放大图表">
            ＋
          </button>
          <button
            ref={closeRef}
            type="button"
            aria-label="关闭大图"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="mermaid-viewer-viewport">
          <div
            className="mermaid-viewer-diagram"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </section>
    </div>,
    document.body
  );
};
```

- [ ] **Step 4: Run the dialog tests and verify GREEN**

Run: `pnpm test -- src/components/MermaidDiagramViewer.test.tsx`

Expected: 2 tests PASS.

- [ ] **Step 5: Write failing toolbar and gesture tests**

Add tests that mock `getBoundingClientRect()` for an `800 × 600` viewport and assert:

```tsx
it("zooms from the toolbar and restores fit scale from the percentage button", async () => {
  const user = userEvent.setup();
  render(<MermaidDiagramViewer svg={svg} onClose={vi.fn()} />);
  expect(
    screen.getByRole("button", { name: "当前比例，点击适应窗口" })
  ).toHaveTextContent("50%");
  await user.click(screen.getByRole("button", { name: "放大图表" }));
  expect(
    screen.getByRole("button", { name: "当前比例，点击适应窗口" })
  ).toHaveTextContent("75%");
  await user.click(
    screen.getByRole("button", { name: "当前比例，点击适应窗口" })
  );
  expect(
    screen.getByRole("button", { name: "当前比例，点击适应窗口" })
  ).toHaveTextContent("50%");
});

it("uses ordinary wheel input for pan and modifier wheel input for zoom", () => {
  render(<MermaidDiagramViewer svg={svg} onClose={vi.fn()} />);
  const viewport = screen.getByTestId("mermaid-viewer-viewport");
  fireEvent.wheel(viewport, { deltaX: 20, deltaY: 30 });
  expect(screen.getByTestId("mermaid-viewer-diagram")).toHaveStyle({
    transform: expect.stringContaining("translate(-20px, -30px)")
  });
  fireEvent.wheel(viewport, {
    deltaY: -20,
    ctrlKey: true,
    clientX: 400,
    clientY: 300
  });
  expect(
    screen.getByRole("button", { name: "当前比例，点击适应窗口" })
  ).not.toHaveTextContent("50%");
});
```

- [ ] **Step 6: Run the gesture tests and verify RED**

Run: `pnpm test -- src/components/MermaidDiagramViewer.test.tsx`

Expected: FAIL because scale and pan state are not implemented.

- [ ] **Step 7: Implement fit, toolbar zoom, wheel pan, pinch zoom, drag, and double-click**

Use `DiagramTransform` state, measure the rendered SVG from `viewBox`, and apply one transform string:

```tsx
style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
```

Required event behavior:

```tsx
const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) {
    const nextScale = transform.scale * Math.exp(-event.deltaY * 0.01);
    setTransform((current) =>
      zoomAtPoint(current, nextScale, event, viewportOrigin())
    );
    return;
  }
  setTransform((current) => ({
    ...current,
    x: current.x - event.deltaX,
    y: current.y - event.deltaY
  }));
};
```

Pointer down stores the pointer id and initial coordinates, pointer move adds the delta to `x` and `y`, and pointer up/cancel releases capture. Double-click calls the same pointer-centered zoom function with `scale + 0.25`. Toolbar buttons change scale by `0.25`; their disabled state follows `MIN_DIAGRAM_SCALE` and `MAX_DIAGRAM_SCALE`.

- [ ] **Step 8: Run all viewer tests and verify GREEN**

Run: `pnpm test -- src/components/MermaidDiagramViewer.test.tsx src/lib/diagramViewport.test.ts`

Expected: all viewer and transform tests PASS.

- [ ] **Step 9: Commit the viewer behavior**

```bash
git add src/components/MermaidDiagramViewer.tsx src/components/MermaidDiagramViewer.test.tsx
git commit -m "feat: add interactive mermaid viewer"
```

### Task 3: Mermaid Block Integration

**Files:**

- Modify: `src/components/MermaidBlock.tsx`
- Modify: `src/components/MermaidBlock.test.tsx`

- [ ] **Step 1: Write failing integration tests for the expand entry and focus restoration**

```tsx
it("opens the rendered diagram in the large viewer and restores trigger focus", async () => {
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
  expect(
    screen.getByRole("dialog", { name: "Mermaid 图表查看器" })
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "关闭大图" }));
  expect(trigger).toHaveFocus();
});

it("does not show the large-view entry when Mermaid rendering fails", async () => {
  vi.mocked(mermaid.render).mockRejectedValue(new Error("Invalid syntax"));
  render(<MermaidBlock code="invalid code" />);
  expect(
    await screen.findByText("Mermaid error: Invalid syntax")
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "放大查看 Mermaid 图表" })
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the integration tests and verify RED**

Run: `pnpm test -- src/components/MermaidBlock.test.tsx`

Expected: FAIL because the expand entry and viewer integration do not exist.

- [ ] **Step 3: Implement the inline entry and viewer state**

Wrap the current inline SVG container in a positioned `mermaid-block`, add an `isViewerOpen` state, render the entry only when `svg` is non-empty, and restore focus after closing:

```tsx
const [isViewerOpen, setIsViewerOpen] = useState(false);
const expandButtonRef = useRef<HTMLButtonElement>(null);

const closeViewer = () => {
  setIsViewerOpen(false);
  requestAnimationFrame(() => expandButtonRef.current?.focus());
};

return (
  <div className="mermaid-block">
    <button
      ref={expandButtonRef}
      type="button"
      className="mermaid-expand-button"
      aria-label="放大查看 Mermaid 图表"
      onClick={() => setIsViewerOpen(true)}
    >
      放大查看
    </button>
    <div
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
    {isViewerOpen && <MermaidDiagramViewer svg={svg} onClose={closeViewer} />}
  </div>
);
```

- [ ] **Step 4: Run Mermaid block tests and verify GREEN**

Run: `pnpm test -- src/components/MermaidBlock.test.tsx`

Expected: all Mermaid block tests PASS.

- [ ] **Step 5: Commit the integration**

```bash
git add src/components/MermaidBlock.tsx src/components/MermaidBlock.test.tsx
git commit -m "feat: open mermaid diagrams in viewer"
```

### Task 4: Viewer Styling and Runtime Verification

**Files:**

- Modify: `src/styles/markdown.css`
- Create: `design-drafts/active/2026-07-12-mermaid-diagram-viewer/DECISION.md`

- [ ] **Step 1: Add viewer styles using the existing design tokens**

Add styles for:

```css
.mermaid-block {
  position: relative;
}
.mermaid-expand-button {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  height: 28px;
}
.mermaid-viewer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  padding: 24px;
  background: rgb(0 0 0 / 64%);
}
.mermaid-viewer {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 12px;
  background: var(--bg-panel);
}
.mermaid-viewer-toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 9px;
  background: var(--bg-control);
}
.mermaid-viewer-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.mermaid-viewer-viewport[data-dragging="true"] {
  cursor: grabbing;
}
.mermaid-viewer-diagram {
  position: absolute;
  transform-origin: 0 0;
  will-change: transform;
}
```

Complete button default, hover, focus-visible, disabled, dark-theme-compatible, small-viewport, and `prefers-reduced-motion` states. Do not add a wide shadow to the bordered viewer surface.

- [ ] **Step 2: Run formatting and focused tests**

Run: `pnpm fmt && pnpm test -- src/components/MermaidDiagramViewer.test.tsx src/components/MermaidBlock.test.tsx src/lib/diagramViewport.test.ts`

Expected: formatting completes and all focused tests PASS.

- [ ] **Step 3: Run the full automated verification suite**

Run: `pnpm test && pnpm lint && pnpm fmt:check && pnpm build`

Expected: every command exits 0 with no test, lint, formatting, or TypeScript/build failures.

- [ ] **Step 4: Verify the target runtime page**

Open `http://127.0.0.1:3030/?file=repository-architecture.v3.md` and verify:

- “放大查看” appears on each successful Mermaid diagram.
- Opening the long sequence diagram shows the complete diagram at fit scale.
- Toolbar zoom, percentage reset, mouse drag, ordinary wheel pan, and trackpad pinch work.
- `Escape`, backdrop click, and close button exit the viewer.
- Focus returns to “放大查看”.
- Light and dark themes remain readable.
- Document scrolling remains unchanged while the viewer is closed.

- [ ] **Step 5: Record the decision and verification evidence**

Create `DECISION.md` with the final direction, the files changed, automated commands and results, runtime states checked, and whether the runtime baseline was refreshed. If baseline capture is unavailable, state that explicitly.

- [ ] **Step 6: Commit styling and design evidence**

```bash
git add src/styles/markdown.css design-drafts/active/2026-07-12-mermaid-diagram-viewer/DECISION.md
git commit -m "style: finish mermaid diagram viewer"
```
