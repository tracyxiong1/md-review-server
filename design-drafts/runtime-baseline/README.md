# Runtime UI Baseline Cases

Captured from the real running app at `http://127.0.0.1:6160` with the committed fixture in [`fixture/`](./fixture/).

These are runtime baselines, not hand-written static mockups. Use them as the visual and DOM source of truth before shaping Codex handoff UI.

Each case has three artifacts:

- A screenshot for visual comparison.
- A frozen full-page HTML snapshot in `html/`, with runtime CSS inlined and dev scripts removed.
- A `#root` fragment in `fragments/`, useful for inspecting the actual React-rendered structure without the page chrome.

## Reproducing The Baseline

Run the app against the committed fixture:

```bash
BASE_DIR="$PWD/design-drafts/runtime-baseline/fixture" \
REVIEW_DIR="$PWD/design-drafts/runtime-baseline/fixture/reviews" \
API_PORT=3130 \
node server/index.js
```

In another terminal:

```bash
API_PORT=3130 VITE_PORT=6160 ./node_modules/.bin/vite --host 127.0.0.1
```

Then open `http://127.0.0.1:6160/?file=docs%2Fwith-comments.md` or `http://127.0.0.1:6160/?file=docs%2Fno-comments.md` and capture the case matrix.

`cases.json` stores artifact paths relative to this directory so the baseline remains portable across machines.

## Case Matrix

| Case | State                                                  | Screenshot                                                 | HTML                                                              | Fragment                                                                    |
| ---- | ------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 01   | Dark, sidebar collapsed, comments closed, no comments  | [PNG](./01-dark-collapsed-comments-closed-empty.png)       | [HTML](./html/01-dark-collapsed-comments-closed-empty.html)       | [Root](./fragments/01-dark-collapsed-comments-closed-empty.root.html)       |
| 02   | Dark, sidebar collapsed, comments open, no comments    | [PNG](./02-dark-collapsed-comments-open-empty.png)         | [HTML](./html/02-dark-collapsed-comments-open-empty.html)         | [Root](./fragments/02-dark-collapsed-comments-open-empty.root.html)         |
| 03   | Dark, sidebar collapsed, comments open, with comments  | [PNG](./03-dark-collapsed-comments-open-with-comments.png) | [HTML](./html/03-dark-collapsed-comments-open-with-comments.html) | [Root](./fragments/03-dark-collapsed-comments-open-with-comments.root.html) |
| 04   | Dark, sidebar expanded, comments open, with comments   | [PNG](./04-dark-expanded-comments-open-with-comments.png)  | [HTML](./html/04-dark-expanded-comments-open-with-comments.html)  | [Root](./fragments/04-dark-expanded-comments-open-with-comments.root.html)  |
| 05   | Light, sidebar expanded, comments open, with comments  | [PNG](./05-light-expanded-comments-open-with-comments.png) | [HTML](./html/05-light-expanded-comments-open-with-comments.html) | [Root](./fragments/05-light-expanded-comments-open-with-comments.root.html) |
| 06   | Light, sidebar collapsed, comments closed, no comments | [PNG](./06-light-collapsed-comments-closed-empty.png)      | [HTML](./html/06-light-collapsed-comments-closed-empty.html)      | [Root](./fragments/06-light-collapsed-comments-closed-empty.root.html)      |
| 07   | Dark, sidebar collapsed, Mermaid and highlighted code  | [PNG](./07-dark-color-compatibility.png)                   | [HTML](./html/07-dark-color-compatibility.html)                   | [Root](./fragments/07-dark-color-compatibility.root.html)                   |
| 08   | Light, sidebar collapsed, Mermaid and highlighted code | [PNG](./08-light-color-compatibility.png)                  | [HTML](./html/08-light-color-compatibility.html)                  | [Root](./fragments/08-light-color-compatibility.root.html)                  |

Detailed DOM measurements are stored in [cases.json](./cases.json).

## Measurements That Matter

- Comments panel width is about `300px`.
- Collapsed sidebar width is about `46px`.
- Heading navigation is `160px` in the full-text layout, expands to `240px` for detached outlines on previews at least `1440px` wide, and becomes a divider-free `32px` tick rail below the `760px` document-card threshold.
- Long outlines remain independently scrollable, but their internal scrollbar is visually hidden.
- The main document scrollbar remains visible: WebKit browsers use `6px`, while Firefox uses its compact `thin` width. Both use a transparent track and a low-contrast neutral thumb; WebKit strengthens the thumb on hover.
- File rows and version rows scroll independently. The file list keeps a `120px` minimum height, while the version section uses at most `45%` of the sidebar.
- At the `785px` baseline viewport, card widths are `697px` with both side panels collapsed, `459px` with comments open, and `265px` with both file and comments panels open. Each case uses the compact rail so reading width takes priority.
- Comments header without actions is about `113px` high.
- Comments header with `Copy All` and `Clear` actions is about `143px` high.
- Comment markers are compact `16px` buttons anchored in the document gutter.
- The with-comments fixture includes a multi-round reply thread so `Codex` / `你` labels, reply time treatment, and the `Open` default filter stay visible in baseline captures.
- The color-compatibility fixture records Mermaid actor/message/node colors and representative JSON/TypeScript token colors in both themes without changing diagram geometry.
- Only the first visible comment receives the stronger active card treatment. Later comments remain flatter rows.

## Design Implications For Codex Handoff

- Handoff should live inside the comments workflow, but it cannot become another tall block above the comments.
- The handoff affordance should probably be a compact row near `Copy All` / `Clear`, or a collapsible status row below actions.
- Dark mode is the most important baseline in the current Codex split-view context.
- Expanded sidebar plus open comments leaves a narrow document column, so avoid any design that requires widening the comments panel.
- Empty state still needs a Codex story, but it should stay quiet because there are no open comments to submit.
