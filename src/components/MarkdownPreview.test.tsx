import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownPreview } from './MarkdownPreview';
import { Comment } from './CommentList';

vi.mock('./MermaidBlock', () => ({
  MermaidBlock: () => <div data-testid="mermaid-block" />,
}));

const diffViewerMock = vi.hoisted(() => vi.fn());
const darkModeMock = vi.hoisted(() => ({ isDark: false }));
const diffViewerState = vi.hoisted(() => ({ nextMountId: 0 }));

vi.mock('../hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDark: darkModeMock.isDark }),
}));

vi.mock('react-diff-viewer-continued', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    default: function MockReactDiffViewer(props: {
      oldValue: string;
      newValue: string;
      styles?: unknown;
      useDarkTheme?: boolean;
    }) {
      const mountId = React.useRef(++diffViewerState.nextMountId);
      diffViewerMock(props);
      return (
        <div
          data-testid="diff-viewer"
          data-mount-id={mountId.current}
          data-theme={props.useDarkTheme ? 'dark' : 'light'}
        >
          <div>old:{props.oldValue}</div>
          <div>new:{props.newValue}</div>
        </div>
      );
    },
  };
});

describe('MarkdownPreview', () => {
  const baseProps = {
    content: '# Test\n\nBody',
    filename: 'test.md',
  };

  beforeEach(() => {
    darkModeMock.isDark = false;
    diffViewerState.nextMountId = 0;
    diffViewerMock.mockClear();
  });

  it('collapses the comments sidebar by default when there are no comments', () => {
    render(<MarkdownPreview {...baseProps} comments={[]} />);

    expect(screen.getByRole('button', { name: 'Show comments' })).toBeInTheDocument();
    expect(screen.queryByText('No comments yet')).not.toBeInTheDocument();
  });

  it('shows the comments sidebar by default when comments exist', () => {
    const comments: Comment[] = [
      {
        id: 'c001',
        text: 'Please revise this paragraph',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(<MarkdownPreview {...baseProps} comments={comments} />);

    expect(screen.queryByRole('button', { name: 'Show comments' })).not.toBeInTheDocument();
    expect(screen.getByText('Please revise this paragraph')).toBeInTheDocument();
  });

  it('keeps the comments sidebar collapsed by default when only done comments exist', () => {
    const comments: Comment[] = [
      {
        id: 'c001',
        text: 'Answered question',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'resolved',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(<MarkdownPreview {...baseProps} comments={comments} />);

    expect(screen.getByRole('button', { name: 'Show comments' })).toBeInTheDocument();
    expect(screen.queryByText('Answered question')).not.toBeInTheDocument();
  });

  it('expands when comments load after an empty initial render', () => {
    const comments: Comment[] = [
      {
        id: 'c001',
        text: 'Loaded comment',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    const { rerender } = render(<MarkdownPreview {...baseProps} comments={[]} />);

    rerender(<MarkdownPreview {...baseProps} comments={comments} />);

    expect(screen.queryByRole('button', { name: 'Show comments' })).not.toBeInTheDocument();
    expect(screen.getByText('Loaded comment')).toBeInTheDocument();
  });

  it('does not expand when only done comments load after an empty initial render', () => {
    const comments: Comment[] = [
      {
        id: 'c001',
        text: 'Loaded resolved comment',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'resolved',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    const { rerender } = render(<MarkdownPreview {...baseProps} comments={[]} />);

    rerender(<MarkdownPreview {...baseProps} comments={comments} />);

    expect(screen.getByRole('button', { name: 'Show comments' })).toBeInTheDocument();
    expect(screen.queryByText('Loaded resolved comment')).not.toBeInTheDocument();
  });

  it('collapses when the current file has no remaining open comments', () => {
    const openComments: Comment[] = [
      {
        id: 'c001',
        text: 'Loaded comment',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];
    const doneComments: Comment[] = [
      {
        ...openComments[0],
        status: 'resolved',
      },
    ];

    const { rerender } = render(<MarkdownPreview {...baseProps} comments={openComments} />);

    expect(screen.queryByRole('button', { name: 'Show comments' })).not.toBeInTheDocument();

    rerender(<MarkdownPreview {...baseProps} comments={doneComments} />);

    expect(screen.getByRole('button', { name: 'Show comments' })).toBeInTheDocument();
  });

  it('renders frontmatter as document metadata', () => {
    render(
      <MarkdownPreview
        content={'---\ntitle: MDX Sample\ndate: 2026-06-26\nauthor: ryo-manba\n---\n\n# Body'}
        filename="sample.mdx"
        comments={[]}
      />,
    );

    expect(screen.getByText('title: MDX Sample')).toBeInTheDocument();
    expect(screen.getByText('date: 2026-06-26')).toBeInTheDocument();
    expect(screen.getByText('author: ryo-manba')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Body' })).toBeInTheDocument();
  });

  it('shows processed comment markers on target lines', async () => {
    const user = userEvent.setup();
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Please clarify the setup steps',
        selectedText: 'setup',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        targetEndLine: 3,
        targetSelectedText: 'clear setup steps',
        resolution: 'Added the missing setup details.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    const marker = await screen.findByRole('button', { name: 'Processed comments on line 3' });
    expect(marker).toBeInTheDocument();

    await user.click(marker);

    expect(screen.getByText('Please clarify the setup steps')).toBeInTheDocument();
    expect(screen.getByText('Added the missing setup details.')).toBeInTheDocument();
    expect(screen.getByText('guide.v3.md:2')).toBeInTheDocument();
  });

  it('preserves full processed comment source text for long filenames', async () => {
    const user = userEvent.setup();
    const longFilename =
      'seedance25_generator_onboarding_with_a_very_long_versioned_review_filename.v123.md';
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: longFilename,
        text: 'Check the onboarding handoff.',
        selectedText: 'handoff',
        startLine: 12,
        endLine: 12,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Processed comments on line 3' }));

    expect(screen.getByText(`${longFilename}:12`)).toHaveAttribute('title', `${longFilename}:12`);
  });

  it('does not double count the same comment when it is both source and target anchored', async () => {
    const comment: Comment = {
      id: 'c001',
      file: 'guide.v4.md',
      text: 'Clarify the permission boundary',
      selectedText: 'Permission boundary',
      startLine: 3,
      endLine: 3,
      status: 'resolved',
      targetFile: 'guide.v4.md',
      targetStartLine: 3,
      targetEndLine: 3,
      resolution: 'Done.',
      createdAt: new Date('2026-06-30T00:00:00Z'),
    };

    render(
      <MarkdownPreview
        content={'# Guide\n\nPermission boundary'}
        filename="guide.v4.md"
        comments={[comment]}
        targetComments={[comment]}
      />,
    );

    const marker = await screen.findByTestId('review-marker-c001');
    expect(within(marker).queryByText('2')).not.toBeInTheDocument();
  });

  it('stacks current open comments with processed comments on the same line', async () => {
    const comments: Comment[] = [
      {
        id: 'c002',
        file: 'guide.v4.md',
        text: 'Second round comment',
        selectedText: 'Permission boundary',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-07-01T00:00:00Z'),
      },
    ];
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'First round comment',
        selectedText: 'Permission',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nPermission boundary'}
        filename="guide.v4.md"
        comments={comments}
        targetComments={targetComments}
      />,
    );

    const marker = await screen.findByRole('button', { name: 'Review comments on line 3' });
    expect(marker).toHaveTextContent('2');
  });

  it('renders markers in the document gutter layer instead of list item content', async () => {
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'First round comment',
        selectedText: 'exactly once',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\n- exactly once delivery'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    const marker = await screen.findByTestId('review-marker-c001');

    expect(marker.closest('li')).toBeNull();
    expect(marker.closest('.processed-comment-marker-layer')).toBeInTheDocument();
  });

  it('shows open comment markers on source lines', async () => {
    const user = userEvent.setup();
    const comments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v4.md',
        text: 'Clarify the permission boundary',
        selectedText: 'Permission boundary',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nPermission boundary'}
        filename="guide.v4.md"
        comments={comments}
      />,
    );

    const marker = await screen.findByRole('button', { name: 'Review comments on line 3' });
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute('data-status-icon', 'comment');

    await user.click(marker);

    expect(screen.getAllByText('Clarify the permission boundary').length).toBeGreaterThan(1);
    expect(screen.getByText('guide.v4.md:3')).toBeInTheDocument();
  });

  it('uses status-specific marker icons for processed comments', async () => {
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Resolved comment',
        selectedText: 'setup',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
      {
        id: 'c002',
        file: 'guide.v3.md',
        text: 'Partial comment',
        selectedText: 'limits',
        startLine: 4,
        endLine: 4,
        status: 'partially_resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 5,
        resolution: 'Partially done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
      {
        id: 'c003',
        file: 'guide.v3.md',
        text: 'Unresolved comment',
        selectedText: 'risk',
        startLine: 6,
        endLine: 6,
        status: 'unresolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 7,
        resolution: 'Not done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nResolved\n\nPartial\n\nUnresolved'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    expect(await screen.findByTestId('review-marker-c001')).toHaveAttribute(
      'data-status-icon',
      'check',
    );
    expect(await screen.findByTestId('review-marker-c002')).toHaveAttribute(
      'data-status-icon',
      'alert',
    );
    expect(await screen.findByTestId('review-marker-c003')).toHaveAttribute(
      'data-status-icon',
      'alert',
    );
  });

  it('closes marker tips when pressing Escape', async () => {
    const user = userEvent.setup();
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Please clarify the setup steps',
        selectedText: 'setup',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Added the missing setup details.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Processed comments on line 3' }));
    expect(screen.getByText('Added the missing setup details.')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByText('Added the missing setup details.')).not.toBeInTheDocument();
  });

  it('closes processed comment marker tips when clicking outside', async () => {
    const user = userEvent.setup();
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Please clarify the setup steps',
        selectedText: 'setup',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Added the missing setup details.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Processed comments on line 3' }));
    expect(screen.getByText('Added the missing setup details.')).toBeInTheDocument();

    await user.click(screen.getByRole('heading', { name: 'Guide' }));

    expect(screen.queryByText('Added the missing setup details.')).not.toBeInTheDocument();
  });

  it('toggles between markdown preview and diff view when compare content exists', async () => {
    const user = userEvent.setup();

    render(
      <MarkdownPreview
        content={'# Guide\n\nNew text'}
        filename="guide.v2.md"
        comments={[]}
        compareFilename="guide.v1.md"
        compareContent={'# Guide\n\nOld text'}
      />,
    );

    expect(screen.getByRole('button', { name: 'Show preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Show diff' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByTestId('diff-viewer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show diff' }));

    const diffViewer = screen.getByTestId('diff-viewer');
    expect(diffViewer).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show preview' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Show diff' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(diffViewer).toHaveTextContent('old:# Guide Old text');
    expect(diffViewer).toHaveTextContent('new:# Guide New text');
    expect(diffViewerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hideSummary: true,
        showDiffOnly: false,
        splitView: false,
      }),
    );

    expect(screen.getByRole('button', { name: 'Use single-column diff view' })).toHaveTextContent(
      'Single',
    );

    await user.click(screen.getByRole('button', { name: 'Use two-column diff view' }));

    expect(diffViewerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hideSummary: true,
        showDiffOnly: false,
        splitView: true,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Show preview' }));

    expect(screen.queryByTestId('diff-viewer')).not.toBeInTheDocument();
  });

  it('remounts the diff viewer when the active theme changes', async () => {
    const user = userEvent.setup();
    const previewProps = {
      content: '# Guide\n\nNew text',
      filename: 'guide.v2.md',
      comments: [],
      compareFilename: 'guide.v1.md',
      compareContent: '# Guide\n\nOld text',
    };

    const { rerender } = render(<MarkdownPreview {...previewProps} />);

    await user.click(screen.getByRole('button', { name: 'Show diff' }));

    expect(screen.getByTestId('diff-viewer')).toHaveAttribute('data-theme', 'light');
    expect(screen.getByTestId('diff-viewer')).toHaveAttribute('data-mount-id', '1');

    darkModeMock.isDark = true;
    rerender(<MarkdownPreview {...previewProps} />);

    expect(screen.getByTestId('diff-viewer')).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByTestId('diff-viewer')).toHaveAttribute('data-mount-id', '2');
  });

  it('passes app theme variables into the diff viewer dark theme', async () => {
    const user = userEvent.setup();
    darkModeMock.isDark = true;

    render(
      <MarkdownPreview
        content="# Guide\n\nNew text"
        filename="guide.v2.md"
        comments={[]}
        compareFilename="guide.v1.md"
        compareContent="# Guide\n\nOld text"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Show diff' }));

    expect(diffViewerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        useDarkTheme: true,
        styles: expect.objectContaining({
          variables: expect.objectContaining({
            dark: expect.objectContaining({
              diffViewerBackground: 'var(--bg-panel)',
              addedBackground: 'var(--diff-added-bg)',
              removedBackground: 'var(--diff-removed-bg)',
              diffViewerTitleBackground: 'var(--bg-elevated)',
            }),
          }),
        }),
      }),
    );
  });
});
