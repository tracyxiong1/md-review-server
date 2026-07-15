# Document Outline Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Detach the outline into the left workspace on wide previews, remove constrained horizontal gutters and the compact-rail divider, and prevent intermediate active-heading flashes during smooth outline navigation.

**Architecture:** `MarkdownPreview` continues to own scrolling and active-heading state. A small pending-navigation ref temporarily gives click navigation priority over passive scroll tracking, while CSS container queries move the existing `DocumentOutline` between detached, integrated, and compact layouts without changing its public API.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, CSS container queries, Vite.

---

### Task 1: Stabilize Active Heading During Programmatic Navigation

**Files:**

- Modify: `src/components/MarkdownPreview.test.tsx`
- Modify: `src/components/MarkdownPreview.tsx`

- [x] **Step 1: Write the failing regression test**

Add a test beside the existing outline scroll tests. Click `Details`, simulate an intermediate scroll frame where `Overview` would normally become active, and assert that `Details` remains active until scroll activity settles:

```tsx
it("keeps the selected outline heading active during smooth navigation", async () => {
  vi.useFakeTimers();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const frameCallbacks: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frameCallbacks.push(callback);
    return frameCallbacks.length;
  });

  const { container } = render(
    <MarkdownPreview
      content={"# Overview\n\n## Details"}
      filename="guide.md"
      comments={[]}
    />
  );
  const reader = container.querySelector<HTMLElement>(
    ".markdown-reader-scroll"
  )!;
  const details = screen.getByRole("heading", { name: "Details" });
  Object.defineProperty(details, "scrollIntoView", {
    configurable: true,
    value: vi.fn()
  });

  await user.click(screen.getByRole("link", { name: "Details, H2" }));
  fireEvent.scroll(reader);
  act(() => frameCallbacks.shift()?.(16));

  expect(screen.getByRole("link", { name: "Details, H2" })).toHaveAttribute(
    "aria-current",
    "location"
  );

  act(() => vi.advanceTimersByTime(120));
  vi.useRealTimers();
});
```

- [x] **Step 2: Run the regression test and verify RED**

Run:

```bash
pnpm test -- src/components/MarkdownPreview.test.tsx
```

Expected: the new assertion fails because the scroll observer replaces the clicked active heading during the smooth-scroll sequence.

- [x] **Step 3: Implement pending-navigation ownership**

In `MarkdownPreview`, add refs for the pending heading and settle timer:

```tsx
const pendingOutlineNavigationRef = useRef<string | null>(null);
const outlineScrollSettleTimerRef = useRef<number | null>(null);
```

Set the pending heading before `scrollIntoView`, skip intermediate `updateActiveHeading` writes while it is present, and debounce scroll settlement. On settlement, clear the ref while preserving the clicked active item; the next ordinary scroll event resumes position tracking. Cancel the pending state on direct wheel, touch, pointer, or scrolling-key input.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm test -- src/components/MarkdownPreview.test.tsx
```

Expected: all `MarkdownPreview` tests pass.

### Task 2: Add Detached, Integrated, and Compact Layout States

**Files:**

- Modify: `src/components/MarkdownPreview.test.tsx`
- Modify: `src/components/MarkdownPreview.tsx`
- Modify: `src/styles/markdown.css`

- [x] **Step 1: Write the failing structure test**

Extend the outline rendering test to require a layout hook on the reader:

```tsx
const reader = container.querySelector(".markdown-reader");
expect(reader).toHaveClass("with-document-outline");
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm test -- src/components/MarkdownPreview.test.tsx
```

Expected: the reader does not yet have the outline layout class.

- [x] **Step 3: Add the layout hook and CSS states**

Apply the class in `MarkdownPreview`:

```tsx
<section className={`markdown-reader ${showOutline ? 'with-document-outline' : ''}`}>
```

Update `markdown.css` so the scroll area supplies a named inline-size container, removes horizontal padding, and gives integrated outline readers up to `980px`:

```css
.markdown-reader-scroll {
  container-name: markdown-preview;
  container-type: inline-size;
  padding: 24px 0 72px;
}

.markdown-reader.with-document-outline {
  width: min(980px, 100%);
}
```

At `1240px` or wider, restore the reader to the full preview width, center an `820px` document card, and absolutely position the existing outline column near the preview's left edge:

```css
@container markdown-preview (width >= 1240px) {
  .markdown-reader.with-document-outline {
    width: 100%;
  }

  .markdown-reader.with-document-outline .markdown-content {
    display: block;
    position: static;
    width: min(820px, 100%);
    margin-inline: auto;
  }

  .markdown-reader.with-document-outline .document-outline-column {
    position: absolute;
    left: 24px;
    width: 160px;
    border-right: 0;
  }
}
```

Use a `760px` document-card container query for the compact `32px` rail.

- [x] **Step 4: Run focused component tests**

Run:

```bash
pnpm test -- src/components/MarkdownPreview.test.tsx src/components/DocumentOutline.test.tsx
```

Expected: both suites pass.

### Task 3: Focused Verification and Live Preview

**Files:**

- Modify only if necessary: `src/components/MarkdownPreview.tsx`
- Modify only if necessary: `src/styles/markdown.css`

- [x] **Step 1: Run focused quality checks**

Run:

```bash
pnpm test -- src/components/MarkdownPreview.test.tsx src/components/DocumentOutline.test.tsx
pnpm lint
pnpm build
```

Expected: commands exit successfully with no test failures, lint errors, or build errors.

- [x] **Step 2: Inspect the real application**

Open the existing local Vite URL and verify:

- Wide preview: `820px` document card centered, `160px` outline near the preview's left edge.
- Constrained three-panel preview: no `30px` horizontal gutter and the compact rail remains `32px`.
- Clicking a distant outline item keeps that item active throughout the smooth jump.

- [x] **Step 3: Present the live page for review**

Keep the real local project tab open at the document outline design file so the user can inspect both the wide and constrained states before the design draft is archived.

### Task 4: Remove the Compact Rail Divider

**Files:**

- Modify: `src/styles/markdown.css`

- [x] **Step 1: Confirm the existing compact rule does not override the integrated divider**

Inspect the `width < 760px` container query and verify that `.document-outline-column` changes width but still inherits `border-right: 1px solid var(--border-secondary)`.

- [x] **Step 2: Add the minimal compact override**

Update the existing compact column rule:

```css
@container document-outline-card (width < 760px) {
  .document-outline-column {
    width: 32px;
    border-right: 0;
  }
}
```

- [x] **Step 3: Run focused verification**

Run:

```bash
pnpm exec vitest run src/components/DocumentOutline.test.tsx src/components/MarkdownPreview.test.tsx
pnpm exec prettier --check src/styles/markdown.css
git diff --check
```

Expected: both test suites pass, formatting succeeds, and the diff has no whitespace errors.

- [x] **Step 4: Inspect the real application**

Refresh the existing constrained-width local preview and verify that the gray divider is absent, the rail remains `32px`, and the active tick remains blue. Confirm that the integrated full outline retains its divider.
