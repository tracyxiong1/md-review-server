# AGENTS.md

This file provides guidance to coding agents working in this repository.

## Commands

```bash
# Development (runs server + Vite concurrently)
pnpm dev

# Build
pnpm build

# Run tests
pnpm test              # Run tests once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage

# Linting and formatting
pnpm lint              # ESLint + Stylelint
pnpm lint:fix          # Auto-fix lint issues
pnpm fmt               # Prettier format
pnpm fmt:check         # Check formatting
```

## Architecture

This is a CLI tool for reviewing Markdown files with inline comments in the browser.
Comments are persisted by the server in sidecar review files and exposed through HTTP APIs.

### Two Runtime Modes

1. **CLI Mode** (`md-review-server <file>`): single file preview using `CliModeApp`
2. **Dev Mode** (`md-review-server` or `md-review-server <dir>`): file browser with tree view using `DevModeApp`

Mode detection happens in `App.tsx` via `/api/files` endpoint availability.

### Server/Client Split

- **`server/index.js`**: Hono-based Node.js server
  - Serves static files from `dist/`
  - API endpoints: `/api/markdown`, `/api/files`, `/api/watch` (SSE), `/api/session`, `/api/comments`
  - File watching via chokidar for hot reload
  - Comment persistence via `.reviews/*.review.json`
- **`bin/md-review.js`**: CLI entry point, spawns server process
- **`src/`**: React frontend (Vite)

### Key Components

- `MarkdownPreview`: main preview component with line-by-line rendering
- `CommentList`: manages inline comments persisted through server APIs
- `SelectionPopover`: text selection UI for adding comments
- `FileTree`: directory browser with search

### Data Flow

1. CLI parses args and sets `MARKDOWN_FILE_PATH` or `BASE_DIR` env vars.
2. Server reads files from these paths.
3. SSE connection (`/api/watch`) enables hot reload on file changes.
4. Comments are read and written through `/api/comments`, keyed by file path in sidecar files.

## Design And UI Workflow

For UI, product design, review-flow, comments-panel, or Codex handoff work, follow the design context before changing code:

1. Read `PRODUCT.md` for product purpose, users, principles, and trust boundaries.
2. Read `DESIGN.md` for visual system, component rules, and UI constraints.
3. Read `design-drafts/README.md` for draft lifecycle rules.
4. Use `design-drafts/runtime-baseline/` as the source of truth for current UI. Prefer frozen runtime HTML and `#root` fragments over hand-written static drafts.

When starting a new UI/design requirement, create:

```txt
design-drafts/active/YYYY-MM-DD-feature-name/
  BRIEF.md
```

The brief should declare:

- goal
- source runtime baseline files
- states to cover
- constraints
- open questions

Keep new design drafts, screenshots, notes, and critiques inside that active folder. Do not add new loose `.html` files directly under `design-drafts/`.

Before finishing a UI/design requirement, write `DECISION.md` in the active folder. If the shipped UI changes the product surface, refresh `design-drafts/runtime-baseline/` with screenshots, frozen HTML, root fragments, and DOM metrics. Then move the active folder to `design-drafts/archive/YYYY-MM-DD-feature-name/`.

### Codex Handoff Constraints

- Treat Codex handoff as comments workflow state, not as a separate action center.
- Keep the comments panel about 300px wide.
- Avoid tall blocks above the first comment.
- Reuse existing compact buttons, segmented controls, status pills, and panel rhythm.
- Validate dark/light, sidebar collapsed/expanded, comments open/closed, and empty/commented states against runtime baseline cases.
