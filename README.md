# md-review-server

English | [简体中文](./README-zh.md)

[![npm version](https://img.shields.io/npm/v/md-review-server.svg)](https://www.npmjs.com/package/md-review-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-md--review--server-black.svg)](https://github.com/tracyxiong1/md-review-server)

Review Codex-generated Markdown like a pull request.

`md-review-server` is a visual Markdown review tool for Codex users and local document authors. It provides browser-based previews, document outlines, inline comments, threaded replies, version comparisons, and the bundled `markdown-review-loop` skill for a local review loop:

```text
comment -> revise -> review again
```

## Demo

### Codex review loop

Start a review from Codex, leave focused comments in the browser, then let Codex read those comments, generate the next version, and write back the results:

![Codex Markdown review loop demo](./assets/readme-showcase/codex-review-loop-demo.gif)

### Document navigation and version comparison

Navigate long documents with an outline, inspect Mermaid diagrams, browse versions, and compare changes in unified or split diff views:

![md-review-server workbench demo](./assets/readme-showcase/review-workbench-demo.gif)

## Use cases

- Review technical designs, README files, architecture notes, postmortems, and other Markdown drafts.
- Select exact passages in the browser and leave localized feedback.
- Let Codex read the comments, generate the next document version, and continue the review loop.
- Navigate long documents with the outline and inspect complex Mermaid diagrams in a dedicated viewer.

## Features

### Reading and navigation

- Preview `.md`, `.markdown`, and `.mdx` files with syntax highlighting and Mermaid rendering.
- Display remote images and local images resolved relative to the current Markdown file.
- Generate a responsive H1-H6 outline with jump navigation, active-section tracking, and long-title tooltips.
- Use single-file mode or directory mode with file search, comment summaries, and version history.
- Group related files such as `guide.md`, `guide.v1.md`, and `guide.v2.md` into one version series.
- Switch between Preview and Diff, with both unified and side-by-side diff layouts.
- Use consistent light and dark themes across documents, code blocks, Mermaid diagrams, diffs, and comments.

### Comments and iterative review

- Create comments on selected text while preserving line numbers, selection offsets, and nearby context.
- Manage feedback through `Open`, `Done`, and `All` views, with editing, deletion, copying, and jump-to-content actions.
- Add replies from `Codex` or `You`; replying to a completed comment reopens it for the next review round.
- Show where comments from the previous version were addressed in the new version.
- Persist comments and replies in `.reviews/*.review.json` sidecar files without modifying the Markdown source.

### Mermaid diagram viewer

- Render Mermaid diagrams inline and open them in a dedicated large-format viewer.
- Fit diagrams to the viewport, zoom with buttons or double-click, drag to pan, and use mouse-wheel or trackpad gestures.
- Use an accessible dialog with focus trapping, `Escape` to close, and focus restoration.

### Codex review loop

- Install, update, and diagnose the bundled `markdown-review-loop` skill.
- Let Codex read open comments through the HTTP API and write back statuses, replies, and locations in the next version.
- Generate a new versioned Markdown file for each revision while preserving earlier versions.
- Run in read-only mode when comments must be disabled.
- Keep the local server on `127.0.0.1` by default.

## Quick start

### Install the skill

Ask Codex to install it:

```text
Install the skill from https://www.npmjs.com/package/md-review-server
```

Or install it manually:

```sh
npx -y md-review-server@latest skill install
npx -y md-review-server@latest skill doctor
```

### Start a review

In Codex, enter:

```text
Use $markdown-review-loop to start a review loop for docs/example.md.
```

Codex opens the local review page. Select text in the browser and create comments.

### Generate the next version

After commenting, return to Codex and enter:

```text
I finished commenting. Read the comments and generate the next version.
```

Codex creates a new version, for example:

```text
example.v1.md -> example.v2.md
```

If the document needs another pass, comment on the new version and tell Codex:

```text
I added comments to the new version. Continue the review loop.
```

## Screenshots

Directory mode combines Markdown files, version history, comment counts, and theme controls:

![Directory-mode workbench](./assets/readme-showcase/workbench-preview.png)

Comments stay anchored to the selected text and are managed from a compact side panel:

![Inline comments panel](./assets/readme-showcase/comment-review.png)

Diff mode compares the current document with its previous version and follows the active theme:

![Dark-mode diff](./assets/readme-showcase/diff-dark.png)

## Run the review server manually

You can run the local server without the Codex skill:

```sh
npx -y md-review-server@latest docs --port 3030 --active-file docs/guide.md
```

Or install it globally:

```sh
npm install -g md-review-server
md-review-server docs --port 3030
```

The server listens on `127.0.0.1` by default. Using `--host 0.0.0.0` prints a security warning when the server starts.

## CLI usage

```sh
md-review-server [options]              # Browse Markdown files in the current directory
md-review-server <file> [options]       # Preview one Markdown file
md-review-server <directory> [options]  # Browse Markdown files in a directory
```

### Options

```sh
-p, --port <port>           Server port (default: 3030)
    --host <host>           Bind host (default: 127.0.0.1)
    --review-dir <dir>      Review sidecar directory (default: .reviews)
    --active-file <file>    Initially selected file in directory mode
    --readonly              Disable comment write APIs
    --no-analytics          Disable anonymous Umami analytics
    --analytics-url <url>   Override the Umami script URL
    --analytics-id <id>     Override the Umami website ID
    --analytics-path <path> Override the sanitized analytics path (default: /review)
    --no-open               Do not open the browser automatically
    skill <command>         Install, update, or inspect the bundled Codex skill
-h, --help                  Show help
-v, --version               Show the version
```

### Skill management

```sh
md-review-server skill install          # Install the bundled skill
md-review-server skill update           # Update the bundled skill
md-review-server skill update --force   # Overwrite the installed copy
md-review-server skill doctor           # Check the installed version and status
```

## Anonymous analytics

`md-review-server` uses Umami by default to measure anonymous page visits and document usage depth. Before sending page events, it rewrites the path to `/review`, clears the referrer, and uses fixed title and hostname values. Standard Umami screen-size and browser-language fields are still included.

The document lifecycle begins only after the first comment is created. Previewing a document does not create lifecycle state. The server generates a random UUID in `.reviews/<document>.document.json` and groups versioned files such as `.v1` and `.v2` under the same document. Renaming an ordinary file does not automatically preserve its document ID.

Only the following lifecycle events are sent to Umami:

- `document_initialized`: the document enters review for the first time; sends only `document_id`
- `document_opened`: one effective visit, counted at most once per 30-minute window; sends `document_id` and `open_seq`
- `document_revised`: a previously unseen content version is detected; sends `document_id`, `revision_seq`, and `round_seq`
- `review_round_started`: a content version receives its first comment; sends `document_id`, `revision_seq`, and `round_seq`

Markdown filenames, local paths, document content, comments, selected text, and content digests are never sent to Umami. Content digests remain local and are used only to recognize versions that have already been seen. Failed events remain in a local outbox until they are sent and acknowledged successfully.

Disable anonymous analytics with:

```sh
md-review-server docs --no-analytics
```

Or use an environment variable:

```sh
MD_REVIEW_ANALYTICS=0 md-review-server docs
```

To use a self-hosted or different Umami website:

```sh
md-review-server docs \
  --analytics-url https://cloud.umami.is/script.js \
  --analytics-id your-website-id
```

## Advanced usage

### Technical design

See the [Codex Review Workbench technical design](./docs/codex-review-workbench-tech-design.md) for the current implementation direction and design decisions.

### Versioned documents

Directory mode groups Markdown files with the same base name and different version numbers:

```text
guide.md
guide.v1.md
guide.v2.md
```

Versions are sorted in descending order and marked with their current, reviewed, or historical status. `markdown-review-loop` creates new files instead of overwriting previous versions.

### Review data

The server stores review state next to the Markdown documents:

```text
docs/.reviews/guide.v2.review.json
docs/.reviews/guide.md.document.json
```

The `.review.json` file stores comments for one document version, including source positions, selected text, nearby context, status, replies, and resolved locations in the next version. The `.document.json` file stores lifecycle state for the entire version series.

Supported comment statuses:

- `open`: waiting for Codex or additional user feedback
- `resolved`: fully addressed
- `partially_resolved`: only partly addressed
- `unresolved`: could not be addressed
- `ignored`: explicitly skipped

When a user replies to a completed comment, the service sets it back to `open` for the next review round.

### HTTP API

| Method | Path                           | Purpose                                                 |
| ------ | ------------------------------ | ------------------------------------------------------- |
| GET    | `/api/health`                  | Check server health                                     |
| GET    | `/api/session`                 | Get mode, root, active file, and read-only state        |
| GET    | `/api/files`                   | List Markdown files in directory mode                   |
| GET    | `/api/markdown`                | Read Markdown in single-file mode                       |
| GET    | `/api/markdown/:path`          | Read a selected Markdown file in directory mode         |
| GET    | `/api/watch`                   | Subscribe to file-change events                         |
| GET    | `/api/comments`                | Read comments by file, status, or target file           |
| POST   | `/api/comments`                | Create a comment                                        |
| PATCH  | `/api/comments/:id`            | Update a comment, append a reply, or write back results |
| PATCH  | `/api/comments`                | Write back statuses, replies, and locations in bulk     |
| DELETE | `/api/comments/:id`            | Delete a comment                                        |
| POST   | `/api/document-analytics/sync` | Read pending sanitized lifecycle events                 |
| POST   | `/api/document-analytics/ack`  | Acknowledge successfully delivered lifecycle events     |

## Local development

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm lint
```

## Releases and changelog

Changes are recorded in [CHANGELOG.md](./CHANGELOG.md).

The project uses Release Please through GitHub Actions. Conventional commits merged into `main` are collected into a release PR that updates `package.json`, `.release-please-manifest.json`, and `CHANGELOG.md`. Merging that PR creates the GitHub Release and version tag, then publishes the package to npm.

Common commit prefixes:

- `feat:` creates a minor release
- `fix:` creates a patch release
- `feat!:` and `fix!:` or a `BREAKING CHANGE:` footer create a major release

Pushing a `v*.*.*` tag manually still triggers npm publishing, but it does not update the changelog. Use the Release Please PR for normal releases.

## License

[MIT](./LICENSE)
