# Decision: Independently Scrolling File Versions

## Final Direction

The file tree sidebar is a fixed-height flex column with a fixed header and footer. The file list retains the remaining space with a `120px` minimum height. The Versions section uses at most `45%` of the sidebar and contains a dedicated `.file-tree-version-list` scroll region.

Both file and version lists use the quiet scrollbar treatment shared with the document page: WebKit browsers use a `6px` transparent track with a neutral thumb, while Firefox uses `thin` with the same colors.

## Why

A long version history previously expanded the Versions section without an internal boundary, reducing file-list space and risking displacement of the sidebar footer. Separating the two scroll regions keeps files, versions, theme control, and repository link independently reachable.

## Preserved Behavior

- Version rows remain buttons with the same labels, state text, counts, and selection callbacks.
- File search, directory expansion, active rows, and review badges do not change.
- The Versions heading remains fixed above its scrolling rows.
- The sidebar footer remains visible at normal application heights.

## Landed In

- `src/components/FileTree.tsx`
- `src/components/FileTree.test.tsx`
- `src/styles/filetree.css`
- `src/styles/filetree.test.ts`
- `DESIGN.md`

## Baseline Updated

The frozen runtime HTML and root fragments for expanded-sidebar cases now include the dedicated version-list wrapper and updated file-tree CSS. Existing screenshots and metrics remain unchanged because the committed fixture has a short version history that does not overflow.
