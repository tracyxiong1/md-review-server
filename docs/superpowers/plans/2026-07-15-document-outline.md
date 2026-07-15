# Document Outline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-visible, card-integrated `H1`–`H6` outline that navigates and tracks the current section in both CLI and directory browsing modes.

**Architecture:** Parse the same frontmatter-free Markdown body used by `ReactMarkdown` into a small heading model with body-relative line IDs. Render a focused `DocumentOutline` beside `markdown-document-body`, while `MarkdownPreview` owns DOM navigation and scroll-derived active state. Keep the outline absent for heading-free documents and Diff mode; defer collapse and responsive hiding until runtime review.

**Tech Stack:** React 19, TypeScript, ReactMarkdown/remark AST, Vitest, Testing Library, CSS

---

## File Structure

- Modify `package.json` and `pnpm-lock.yaml`: declare the AST utilities imported by application code.
- Create `src/lib/extractDocumentHeadings.ts`: parse Markdown headings, extract visible text, and generate line-based IDs.
- Create `src/lib/extractDocumentHeadings.test.ts`: cover all heading levels, inline syntax, duplicates, code fences, Setext headings, and empty input.
- Create `src/components/DocumentOutline.tsx`: render the semantic heading list, active state, truncation title, and internal list scrolling.
- Create `src/components/DocumentOutline.test.tsx`: cover hierarchy, current item, navigation, title text, and active-item visibility.
- Modify `src/components/MarkdownPreview.tsx`: compose outline and body, write matching heading IDs, navigate headings, and derive current section from the preview scroller.
- Modify `src/components/MarkdownPreview.test.tsx`: cover integration, click navigation, reduced motion, scroll tracking, file replacement, heading-free content, and Diff mode.
- Modify `src/styles/markdown.css`: add the card-internal two-column layout and quiet outline styling while preserving the body and comment marker geometry.
- Create `design-drafts/active/2026-07-15-document-minimap/DECISION.md`, then archive the folder after runtime verification.
- Refresh `design-drafts/runtime-baseline/`: recapture the shipped light/dark, file-sidebar, comments, empty/commented, and color-compatibility states.

### Task 1: Markdown Heading Model

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/lib/extractDocumentHeadings.ts`
- Test: `src/lib/extractDocumentHeadings.test.ts`

- [ ] **Step 1: Write the failing heading extraction tests**

````ts
import { describe, expect, it } from "vitest";
import {
  extractDocumentHeadings,
  getDocumentHeadingId
} from "./extractDocumentHeadings";

describe("extractDocumentHeadings", () => {
  it("extracts H1 through H6 with visible inline text", () => {
    const markdown = [
      "# Product `guide`",
      "## Current *flow*",
      "### Proposed [flow](https://example.com)",
      "#### Failure ~~state~~",
      "##### Retry path",
      "###### Local fallback"
    ].join("\n");

    expect(extractDocumentHeadings(markdown)).toEqual([
      { id: "markdown-heading-1", text: "Product guide", level: 1, line: 1 },
      { id: "markdown-heading-2", text: "Current flow", level: 2, line: 2 },
      { id: "markdown-heading-3", text: "Proposed flow", level: 3, line: 3 },
      { id: "markdown-heading-4", text: "Failure state", level: 4, line: 4 },
      { id: "markdown-heading-5", text: "Retry path", level: 5, line: 5 },
      { id: "markdown-heading-6", text: "Local fallback", level: 6, line: 6 }
    ]);
  });

  it("supports Setext headings and keeps duplicate labels independently addressable", () => {
    const markdown = [
      "Repeat",
      "======",
      "",
      "# Repeat",
      "",
      "Details",
      "-------"
    ].join("\n");

    expect(extractDocumentHeadings(markdown)).toEqual([
      { id: "markdown-heading-1", text: "Repeat", level: 1, line: 1 },
      { id: "markdown-heading-4", text: "Repeat", level: 1, line: 4 },
      { id: "markdown-heading-6", text: "Details", level: 2, line: 6 }
    ]);
  });

  it("ignores heading-looking text inside fenced code and returns an empty list without headings", () => {
    expect(
      extractDocumentHeadings("```md\n# Not a heading\n```\n\nBody")
    ).toEqual([]);
    expect(extractDocumentHeadings("Plain paragraph")).toEqual([]);
  });

  it("generates the same IDs used by rendered heading components", () => {
    expect(getDocumentHeadingId(12)).toBe("markdown-heading-12");
  });
});
````

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/lib/extractDocumentHeadings.test.ts`

Expected: FAIL because `./extractDocumentHeadings` does not exist.

- [ ] **Step 3: Add explicit AST dependencies**

Run:

```bash
pnpm add mdast-util-to-string remark-parse unified unist-util-visit
pnpm add -D @types/mdast
```

Expected: `package.json` and `pnpm-lock.yaml` include the packages; no unrelated dependency upgrades occur.

- [ ] **Step 4: Implement the heading model and parser**

Create `src/lib/extractDocumentHeadings.ts`:

```ts
import type { Heading } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export interface DocumentHeading {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  line: number;
}

export const getDocumentHeadingId = (line: number) =>
  `markdown-heading-${line}`;

export const extractDocumentHeadings = (
  markdown: string
): DocumentHeading[] => {
  try {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
    const headings: DocumentHeading[] = [];

    visit(tree, "heading", (node: Heading) => {
      const line = node.position?.start.line;
      const text = toString(node).trim();
      if (!line || !text) return;

      headings.push({
        id: getDocumentHeadingId(line),
        text,
        level: node.depth,
        line
      });
    });

    return headings;
  } catch {
    return [];
  }
};
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm test -- src/lib/extractDocumentHeadings.test.ts`

Expected: 4 tests PASS.

- [ ] **Step 6: Commit the heading model**

```bash
git add package.json pnpm-lock.yaml src/lib/extractDocumentHeadings.ts src/lib/extractDocumentHeadings.test.ts
git commit -m "feat: extract markdown document headings"
```

### Task 2: Lightweight Document Outline Component

**Files:**

- Create: `src/components/DocumentOutline.tsx`
- Test: `src/components/DocumentOutline.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentOutline } from "./DocumentOutline";

const headings = [
  { id: "markdown-heading-1", text: "Overview", level: 1 as const, line: 1 },
  {
    id: "markdown-heading-3",
    text: "A very long implementation section",
    level: 3 as const,
    line: 3
  }
];

describe("DocumentOutline", () => {
  it("renders a semantic outline with hierarchy and full-text titles", () => {
    render(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-1"
        onNavigate={vi.fn()}
      />
    );

    const outline = screen.getByRole("navigation", {
      name: "Document outline"
    });
    const overview = screen.getByRole("link", { name: "Overview" });
    const implementation = screen.getByRole("link", {
      name: "A very long implementation section"
    });

    expect(outline).toBeInTheDocument();
    expect(overview).toHaveAttribute("aria-current", "location");
    expect(overview).toHaveAttribute("data-level", "1");
    expect(implementation).toHaveAttribute("data-level", "3");
    expect(implementation).toHaveAttribute(
      "title",
      "A very long implementation section"
    );
  });

  it("navigates without changing the URL", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-1"
        onNavigate={onNavigate}
      />
    );

    await user.click(
      screen.getByRole("link", { name: "A very long implementation section" })
    );

    expect(onNavigate).toHaveBeenCalledWith("markdown-heading-3");
    expect(window.location.hash).toBe("");
  });

  it("scrolls only its own viewport when the active item leaves view", () => {
    const { rerender } = render(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-1"
        onNavigate={vi.fn()}
      />
    );
    const outline = screen.getByRole("navigation", {
      name: "Document outline"
    });
    Object.defineProperties(outline, {
      clientHeight: { configurable: true, value: 80 },
      scrollTop: { configurable: true, writable: true, value: 0 }
    });

    const next = screen.getByRole("link", {
      name: "A very long implementation section"
    });
    Object.defineProperties(next, {
      offsetTop: { configurable: true, value: 120 },
      offsetHeight: { configurable: true, value: 24 }
    });

    rerender(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-3"
        onNavigate={vi.fn()}
      />
    );

    expect(outline.scrollTop).toBe(64);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/components/DocumentOutline.test.tsx`

Expected: FAIL because `DocumentOutline` does not exist.

- [ ] **Step 3: Implement the isolated outline component**

Create `src/components/DocumentOutline.tsx`:

```tsx
import { useEffect, useRef } from "react";
import type { DocumentHeading } from "../lib/extractDocumentHeadings";

interface DocumentOutlineProps {
  headings: DocumentHeading[];
  activeHeadingId: string | null;
  onNavigate: (headingId: string) => void;
}

export const DocumentOutline = ({
  headings,
  activeHeadingId,
  onNavigate
}: DocumentOutlineProps) => {
  const outlineRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const outline = outlineRef.current;
    const activeItem = activeItemRef.current;
    if (!outline || !activeItem) return;

    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    if (itemTop < outline.scrollTop) {
      outline.scrollTop = itemTop;
    } else if (itemBottom > outline.scrollTop + outline.clientHeight) {
      outline.scrollTop = itemBottom - outline.clientHeight;
    }
  }, [activeHeadingId]);

  return (
    <aside className="document-outline-column">
      <nav
        ref={outlineRef}
        className="document-outline"
        aria-label="Document outline"
      >
        <ol className="document-outline-list">
          {headings.map((heading) => {
            const isActive = heading.id === activeHeadingId;
            return (
              <li key={heading.id} className="document-outline-item">
                <a
                  ref={isActive ? activeItemRef : undefined}
                  className={`document-outline-link ${isActive ? "active" : ""}`}
                  href={`#${heading.id}`}
                  title={heading.text}
                  data-level={heading.level}
                  aria-current={isActive ? "location" : undefined}
                  style={{
                    paddingInlineStart: `${8 + (heading.level - 1) * 10}px`
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(heading.id);
                  }}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
};
```

- [ ] **Step 4: Run the component tests and verify GREEN**

Run: `pnpm test -- src/components/DocumentOutline.test.tsx`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the outline component**

```bash
git add src/components/DocumentOutline.tsx src/components/DocumentOutline.test.tsx
git commit -m "feat: add document outline component"
```

### Task 3: Markdown Preview Integration and Navigation

**Files:**

- Modify: `src/components/MarkdownPreview.tsx`
- Modify: `src/components/MarkdownPreview.test.tsx`

- [ ] **Step 1: Add failing integration tests for rendering, IDs, navigation, reduced motion, and view boundaries**

Update the Testing Library import to include `fireEvent` and `waitFor`, then add these cases inside the existing `MarkdownPreview` suite:

```tsx
it("renders the outline beside the document body with matching heading IDs", () => {
  const { container } = render(
    <MarkdownPreview
      content={"# Overview\n\n## Details\n\nBody"}
      filename="guide.md"
      comments={[]}
    />
  );

  expect(
    screen.getByRole("navigation", { name: "Document outline" })
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "href",
    "#markdown-heading-1"
  );
  expect(screen.getByRole("heading", { name: "Overview" })).toHaveAttribute(
    "id",
    "markdown-heading-1"
  );
  expect(container.querySelector(".markdown-content")).toHaveClass(
    "with-document-outline"
  );
  expect(
    container.querySelector(".markdown-document-body")
  ).toBeInTheDocument();
});

it("scrolls to a selected outline heading without changing the hash", async () => {
  const user = userEvent.setup();
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView
  });

  render(
    <MarkdownPreview
      content={"# Overview\n\n## Details"}
      filename="guide.md"
      comments={[]}
    />
  );
  await user.click(screen.getByRole("link", { name: "Details" }));

  expect(scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start"
  });
  expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute(
    "aria-current",
    "location"
  );
  expect(window.location.hash).toBe("");
});

it("uses immediate scrolling when reduced motion is requested", async () => {
  const user = userEvent.setup();
  const scrollIntoView = vi.fn();
  vi.mocked(window.matchMedia).mockReturnValueOnce({
    ...window.matchMedia(""),
    matches: true
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView
  });

  render(
    <MarkdownPreview content="# Overview" filename="guide.md" comments={[]} />
  );
  await user.click(screen.getByRole("link", { name: "Overview" }));

  expect(scrollIntoView).toHaveBeenCalledWith({
    behavior: "auto",
    block: "start"
  });
});

it("does not render an empty outline and hides the outline in diff mode", async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <MarkdownPreview content="Plain body" filename="plain.md" comments={[]} />
  );
  expect(
    screen.queryByRole("navigation", { name: "Document outline" })
  ).not.toBeInTheDocument();

  rerender(
    <MarkdownPreview
      content="# New"
      filename="guide.v2.md"
      comments={[]}
      compareFilename="guide.v1.md"
      compareContent="# Old"
    />
  );
  expect(
    screen.getByRole("navigation", { name: "Document outline" })
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Show diff" }));
  expect(
    screen.queryByRole("navigation", { name: "Document outline" })
  ).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Show preview" }));
  expect(
    screen.getByRole("navigation", { name: "Document outline" })
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused integration tests and verify RED**

Run: `pnpm test -- src/components/MarkdownPreview.test.tsx`

Expected: the new outline assertions FAIL while existing Markdown preview tests remain GREEN.

- [ ] **Step 3: Add heading IDs and compose the outline with the body**

In `MarkdownPreview.tsx`:

```tsx
import { DocumentOutline } from "./DocumentOutline";
import {
  extractDocumentHeadings,
  getDocumentHeadingId
} from "../lib/extractDocumentHeadings";
```

Extend `createComponentsWithLinePosition` so rendered headings use the same ID model:

```tsx
const isHeadingTag = typeof Tag === "string" && /^h[1-6]$/.test(Tag);
const headingId =
  isHeadingTag && typeof line === "number"
    ? getDocumentHeadingId(line)
    : undefined;

return (
  <Tag
    {...props}
    id={headingId || props.id}
    data-line-start={line}
    className={className || undefined}
  >
    {children}
  </Tag>
);
```

Move `const documentKey = filePath || filename` directly below `parseMdContent`, remove its later declaration, and add the outline state there:

```tsx
const headings = useMemo(() => extractDocumentHeadings(body), [body]);
const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
const showOutline = !showDiff && headings.length > 0;

useEffect(() => {
  setActiveHeadingId(headings[0]?.id || null);
}, [documentKey, headings]);
```

Add navigation that respects reduced motion:

```tsx
const handleOutlineNavigate = (headingId: string) => {
  const heading = contentRef.current?.querySelector<HTMLElement>(
    `#${headingId}`
  );
  if (!heading) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  heading.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start"
  });
  setActiveHeadingId(headingId);
};
```

Attach `readerScrollRef` to `.markdown-reader-scroll`, then replace the Preview branch wrapper with:

```tsx
<div
  className={`markdown-content ${showOutline ? "with-document-outline" : ""}`}
>
  {showOutline && (
    <DocumentOutline
      headings={headings}
      activeHeadingId={activeHeadingId}
      onNavigate={handleOutlineNavigate}
    />
  )}
  <div className="markdown-document-body" ref={contentRef}>
    <div className="document-meta">
      <span>{documentMeta}</span>
      {frontmatterEntries.map(([key, value]) => (
        <span key={key} className="document-meta-item">
          {key}: {value}
        </span>
      ))}
    </div>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeHighlight]}
      components={componentsWithLinePosition}
    >
      {body}
    </ReactMarkdown>
    {markerGroups.length > 0 && (
      <div className="processed-comment-marker-layer">
        {markerGroups.map((group) => {
          const top = markerPositions[group.line];
          if (typeof top !== "number") return null;

          return (
            <ProcessedCommentMarker
              key={group.line}
              line={group.line}
              comments={group.comments}
              label={group.label}
              top={top}
            />
          );
        })}
      </div>
    )}
  </div>
</div>
```

Keep the existing marker mapping inside the marker layer; only move it into `markdown-document-body`. Keep `SelectionPopover` pointed at `contentRef` so outline text cannot become a comment selection.

- [ ] **Step 4: Run the integration tests and verify GREEN**

Run: `pnpm test -- src/components/MarkdownPreview.test.tsx`

Expected: all `MarkdownPreview` tests PASS, including the four new outline cases.

- [ ] **Step 5: Commit preview integration**

```bash
git add src/components/MarkdownPreview.tsx src/components/MarkdownPreview.test.tsx
git commit -m "feat: integrate outline with markdown preview"
```

### Task 4: Scroll Tracking and Card-Integrated Styling

**Files:**

- Modify: `src/components/MarkdownPreview.tsx`
- Modify: `src/components/MarkdownPreview.test.tsx`
- Modify: `src/styles/markdown.css`

- [ ] **Step 1: Add a failing scroll-tracking test**

```tsx
it("tracks the last heading above the reader threshold", async () => {
  const secondHeadingTop = { value: 140 };
  const rect = (top: number) =>
    ({
      top,
      bottom: top + 24,
      left: 0,
      right: 200,
      width: 200,
      height: 24,
      x: 0,
      y: top
    }) as DOMRect;
  const rectSpy = vi
    .spyOn(Element.prototype, "getBoundingClientRect")
    .mockImplementation(function () {
      const element = this as HTMLElement;
      if (element.classList.contains("markdown-reader-scroll")) return rect(0);
      if (element.id === "markdown-heading-1") return rect(20);
      if (element.id === "markdown-heading-3")
        return rect(secondHeadingTop.value);
      return rect(0);
    });
  const frameSpy = vi
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((callback) => {
      callback(0);
      return 1;
    });

  const { container } = render(
    <MarkdownPreview
      content={"# Overview\n\n## Details\n\nBody"}
      filename="guide.md"
      comments={[]}
    />
  );
  expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "location"
  );

  secondHeadingTop.value = 60;
  fireEvent.scroll(
    container.querySelector(".markdown-reader-scroll") as HTMLElement
  );

  await waitFor(() =>
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute(
      "aria-current",
      "location"
    )
  );

  rectSpy.mockRestore();
  frameSpy.mockRestore();
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/components/MarkdownPreview.test.tsx -t "tracks the last heading"`

Expected: FAIL because scrolling does not update `activeHeadingId`.

- [ ] **Step 3: Implement requestAnimationFrame-coalesced scroll tracking**

Add `readerScrollRef` beside `contentRef`, attach it to `.markdown-reader-scroll`, and add:

```tsx
useLayoutEffect(() => {
  if (!showOutline) return;

  const reader = readerScrollRef.current;
  const contentElement = contentRef.current;
  if (!reader || !contentElement) return;

  let frameId = 0;
  const updateActiveHeading = () => {
    const threshold = reader.getBoundingClientRect().top + 96;
    let nextHeadingId = headings[0]?.id || null;

    for (const heading of headings) {
      const element = contentElement.querySelector<HTMLElement>(
        `#${heading.id}`
      );
      if (!element || element.getBoundingClientRect().top > threshold) break;
      nextHeadingId = heading.id;
    }

    setActiveHeadingId((current) =>
      current === nextHeadingId ? current : nextHeadingId
    );
  };
  const scheduleUpdate = () => {
    window.cancelAnimationFrame(frameId);
    frameId = window.requestAnimationFrame(updateActiveHeading);
  };

  scheduleUpdate();
  reader.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);

  return () => {
    window.cancelAnimationFrame(frameId);
    reader.removeEventListener("scroll", scheduleUpdate);
    window.removeEventListener("resize", scheduleUpdate);
  };
}, [headings, showOutline]);
```

- [ ] **Step 4: Move card padding to the body and add quiet outline styles**

Update `src/styles/markdown.css` with these rules, preserving all existing Markdown descendant styles:

```css
.markdown-content {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14.5px;
  line-height: 1.76;
  position: relative;
  padding: 0;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  overflow-wrap: break-word;
}

.markdown-content.with-document-outline {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
}

.markdown-document-body {
  position: relative;
  min-width: 0;
  padding: 34px 42px 48px;
}

.document-outline-column {
  min-width: 0;
  border-right: 1px solid var(--border-secondary);
}

.document-outline {
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 100px);
  padding: 24px 12px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.document-outline-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.document-outline-item {
  margin: 0;
}

.document-outline-link {
  position: relative;
  display: block;
  padding-top: 6px;
  padding-right: 5px;
  padding-bottom: 6px;
  overflow: hidden;
  color: var(--text-tertiary);
  border-radius: 5px;
  font-size: 11.5px;
  line-height: 1.3;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-outline-link:hover {
  color: var(--text-secondary);
  background: transparent;
}

.document-outline-link.active {
  color: var(--link-color);
  font-weight: 500;
}

.document-outline-link.active::before {
  position: absolute;
  top: 7px;
  left: 0;
  width: 2px;
  height: 14px;
  background: var(--link-color);
  border-radius: 2px;
  content: "";
}

.document-outline-link:focus-visible {
  color: var(--text-primary);
  outline: 2px solid var(--link-color);
  outline-offset: 1px;
}
```

In existing `@media (width <= 1180px)` and `@media (width <= 860px)` blocks, replace `.markdown-content` padding adjustments with `.markdown-document-body` using the same values. Do not add a hide, collapse, or breakpoint-specific outline width rule.

- [ ] **Step 5: Run focused tests, style lint, and build**

Run:

```bash
pnpm test -- src/lib/extractDocumentHeadings.test.ts src/components/DocumentOutline.test.tsx src/components/MarkdownPreview.test.tsx
pnpm lint:css
pnpm build
```

Expected: focused tests PASS, Stylelint exits 0, and TypeScript/Vite build succeeds.

- [ ] **Step 6: Commit scroll tracking and styling**

```bash
git add src/components/MarkdownPreview.tsx src/components/MarkdownPreview.test.tsx src/styles/markdown.css
git commit -m "feat: track active markdown section"
```

### Task 5: Runtime Verification, Baseline Refresh, and Design Closure

**Files:**

- Modify: `design-drafts/runtime-baseline/*.png`
- Modify: `design-drafts/runtime-baseline/html/*.html`
- Modify: `design-drafts/runtime-baseline/fragments/*.root.html`
- Modify: `design-drafts/runtime-baseline/cases.json`
- Create: `design-drafts/active/2026-07-15-document-minimap/DECISION.md`
- Move: `design-drafts/active/2026-07-15-document-minimap/` to `design-drafts/archive/2026-07-15-document-minimap/`

- [ ] **Step 1: Run the complete automated verification suite**

Run:

```bash
pnpm test
pnpm build
pnpm lint
pnpm fmt:check
```

Expected: all tests PASS; build, ESLint, Stylelint, and Prettier exit 0.

- [ ] **Step 2: Start the committed runtime baseline fixture**

Terminal 1:

```bash
BASE_DIR="$PWD/design-drafts/runtime-baseline/fixture" REVIEW_DIR="$PWD/design-drafts/runtime-baseline/fixture/reviews" API_PORT=3130 node server/index.js
```

Terminal 2:

```bash
API_PORT=3130 VITE_PORT=6160 ./node_modules/.bin/vite --host 127.0.0.1
```

Expected: `http://127.0.0.1:6160/?file=docs%2Fwith-comments.md` renders the outline inside the document card.

- [ ] **Step 3: Verify the runtime state matrix before accepting the surface**

Inspect and recapture the eight cases listed in `design-drafts/runtime-baseline/cases.json` at the existing `785 × 994` viewport. For every case, save the screenshot, frozen full-page HTML, `#root` fragment, and DOM metrics back to its existing artifact path.

Acceptance checks:

```text
Dark + light: outline text, active blue line, divider, and focus remain readable.
File sidebar collapsed + expanded: outline stays inside the document card.
Comments closed + open: comment panel remains about 300px and markers stay on the body boundary.
Empty + commented: outline does not change comment state or selection behavior.
Color compatibility: Mermaid and highlighted code geometry remain unchanged.
Preview + Diff: outline is present only in Preview and returns after switching back.
```

If the three-column expanded state is dense but usable, keep the approved first version unchanged and record the observation. Do not add collapse or responsive hiding during this task.

- [ ] **Step 4: Write the shipped decision record**

Create `design-drafts/active/2026-07-15-document-minimap/DECISION.md`:

```md
# Document Outline Decision

## Shipped direction

The Markdown preview renders an `H1`–`H6` outline inside the document card. The outline and body share one panel surface, use a single divider, and keep the active section visible with blue text and a thin blue line.

## Interaction

- Clicking an outline item scrolls to the matching rendered heading.
- Document scrolling updates the active outline item.
- Long labels remain single-line and expose their full text through the title attribute.
- Heading-free documents and Diff mode do not render the outline.

## Deferred scope

Manual collapse, automatic hiding, responsive outline width, resizable width, and persisted visibility remain deferred until the first shipped layout is reviewed in normal use.

## Verification

- Unit and component tests cover AST extraction, duplicate labels, all heading levels, navigation, active tracking, reduced motion, empty content, and Diff mode.
- The complete runtime baseline matrix was recaptured in dark and light themes with file and comment sidebars in their documented states.
- Comment markers remain anchored to the document body and outline text remains outside the selection container.
```

- [ ] **Step 5: Archive the completed design draft**

Run:

```bash
mkdir -p design-drafts/archive
mv design-drafts/active/2026-07-15-document-minimap design-drafts/archive/2026-07-15-document-minimap
```

Expected: the active folder no longer exists and the archived folder contains `BRIEF.md` and `DECISION.md`.

- [ ] **Step 6: Re-run repository checks after artifact updates**

Run:

```bash
pnpm test
pnpm build
pnpm lint
pnpm fmt:check
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit runtime evidence and design closure**

```bash
git add design-drafts/runtime-baseline design-drafts/archive/2026-07-15-document-minimap
git commit -m "docs: capture document outline runtime baseline"
```
