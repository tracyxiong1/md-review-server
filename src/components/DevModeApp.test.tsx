import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevModeApp } from './DevModeApp';

const mocks = vi.hoisted(() => ({
  reloadFiles: vi.fn(),
  setSelectedFile: vi.fn(),
  useFileWatch: vi.fn(),
  fileTree: vi.fn(),
  markdownPreview: vi.fn(),
  reviewSummaryReload: vi.fn(),
}));

vi.mock('../hooks/useFileList', () => ({
  useFileList: () => ({
    files: [
      { name: 'sample.v2.md', path: 'sample.v2.md', dir: '.' },
      { name: 'sample.v3.md', path: 'sample.v3.md', dir: '.' },
    ],
    selectedFile: 'sample.v3.md',
    setSelectedFile: mocks.setSelectedFile,
    reload: mocks.reloadFiles,
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useMarkdown', () => ({
  useMarkdown: (filePath?: string | null) =>
    filePath === 'sample.v2.md'
      ? {
          content: '# Sample\n\nOld text\n',
          filename: 'sample.v2.md',
          loading: false,
          error: null,
          reload: vi.fn(),
        }
      : {
          content: '# Sample\n\nNew text\n',
          filename: 'sample.v3.md',
          loading: false,
          error: null,
          reload: vi.fn(),
        },
}));

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    readonly: false,
    reload: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    deleteAllComments: vi.fn(),
    editComment: vi.fn(),
  }),
}));

vi.mock('../hooks/useReviewSummary', () => ({
  useReviewSummary: () => ({
    comments: [],
    summary: {
      byFile: {
        'sample.v3.md': {
          file: 'sample.v3.md',
          openCount: 2,
          doneCount: 0,
          allCount: 2,
        },
      },
      byDirectory: {},
    },
    loading: false,
    error: null,
    reload: mocks.reviewSummaryReload,
  }),
}));

vi.mock('../hooks/useFileWatch', () => ({
  useFileWatch: mocks.useFileWatch,
}));

vi.mock('../hooks/useResizable', () => ({
  useResizable: () => ({
    width: 240,
    isResizing: false,
    isCollapsed: false,
    handleMouseDown: vi.fn(),
    toggleCollapse: vi.fn(),
  }),
}));

vi.mock('./FileTree', () => ({
  FileTree: (props: unknown) => {
    mocks.fileTree(props);
    return <div data-testid="file-tree" />;
  },
}));

vi.mock('./MarkdownPreview', () => ({
  MarkdownPreview: (props: unknown) => {
    mocks.markdownPreview(props);
    return <div data-testid="markdown-preview" />;
  },
}));

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => (
    <button type="button" aria-label="Toggle theme">
      Theme
    </button>
  ),
}));

describe('DevModeApp', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.clearAllMocks();
  });

  it('keeps the file tree open when no file is specified in the URL', () => {
    render(<DevModeApp />);

    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
  });

  it('collapses the file tree by default when a file is specified in the URL', () => {
    window.history.replaceState(null, '', '/?file=sample.v3.md');

    render(<DevModeApp />);

    expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
    expect(screen.getByTitle('Open sidebar')).toBeInTheDocument();
  });

  it('links the collapsed sidebar GitHub icon to the md-review-server repository', () => {
    window.history.replaceState(null, '', '/?file=sample.v3.md');

    render(<DevModeApp />);

    expect(screen.getByLabelText('View on GitHub')).toHaveAttribute(
      'href',
      'https://github.com/tracyxiong1/md-review-server',
    );
  });

  it('places the collapsed sidebar theme toggle in the footer group above the GitHub link', () => {
    window.history.replaceState(null, '', '/?file=sample.v3.md');

    const { container } = render(<DevModeApp />);

    const spacer = container.querySelector('.icon-bar-spacer');
    const githubLink = screen.getByLabelText('View on GitHub');
    const themeToggle = screen.getByLabelText('Toggle theme');

    expect(spacer).not.toBeNull();
    expect(spacer!.compareDocumentPosition(themeToggle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(themeToggle.compareDocumentPosition(githubLink)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('passes the previous version markdown to the preview for comparison', () => {
    render(<DevModeApp />);

    expect(mocks.markdownPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        compareFilename: 'sample.v2.md',
        compareContent: '# Sample\n\nOld text\n',
      }),
    );
  });

  it('passes review summary to the file tree', () => {
    render(<DevModeApp />);

    expect(mocks.fileTree).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewSummary: expect.objectContaining({
          byFile: expect.objectContaining({
            'sample.v3.md': expect.objectContaining({ openCount: 2 }),
          }),
        }),
      }),
    );
  });

  it('selects a newly added successor version of the current file', () => {
    render(<DevModeApp />);

    const onFileAdded = mocks.useFileWatch.mock.calls[0][1];
    onFileAdded('sample.v4.md');

    expect(mocks.reloadFiles).toHaveBeenCalledWith('sample.v4.md');
  });

  it('refreshes the file tree without selecting review queue files', () => {
    render(<DevModeApp />);

    const onFileAdded = mocks.useFileWatch.mock.calls[0][1];
    onFileAdded('sample.review.md');

    expect(mocks.reloadFiles).toHaveBeenCalledWith(null);
  });
});
