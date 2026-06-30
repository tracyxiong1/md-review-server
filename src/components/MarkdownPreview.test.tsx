import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownPreview } from './MarkdownPreview';
import { Comment } from './CommentList';

vi.mock('./MermaidBlock', () => ({
  MermaidBlock: () => <div data-testid="mermaid-block" />,
}));

vi.mock('../hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDark: false }),
}));

const diffViewerMock = vi.hoisted(() => vi.fn());

vi.mock('react-diff-viewer-continued', () => ({
  default: (props: { oldValue: string; newValue: string }) => {
    diffViewerMock(props);
    return (
      <div data-testid="diff-viewer">
        <div>old:{props.oldValue}</div>
        <div>new:{props.newValue}</div>
      </div>
    );
  },
}));

describe('MarkdownPreview', () => {
  const baseProps = {
    content: '# Test\n\nBody',
    filename: 'test.md',
  };

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

    const marker = screen.getByRole('button', { name: 'Processed comments on line 3' });
    expect(marker).toBeInTheDocument();

    await user.click(marker);

    expect(screen.getByText('Please clarify the setup steps')).toBeInTheDocument();
    expect(screen.getByText('Added the missing setup details.')).toBeInTheDocument();
    expect(screen.getByText('guide.v3.md:2')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'Processed comments on line 3' }));
    expect(screen.getByText('Added the missing setup details.')).toBeInTheDocument();

    await user.click(screen.getByRole('heading', { name: 'Guide' }));

    expect(screen.queryByText('Added the missing setup details.')).not.toBeInTheDocument();
  });

  it('toggles between markdown preview and diff view when compare content exists', async () => {
    const user = userEvent.setup();
    diffViewerMock.mockClear();

    render(
      <MarkdownPreview
        content={'# Guide\n\nNew text'}
        filename="guide.v2.md"
        comments={[]}
        compareFilename="guide.v1.md"
        compareContent={'# Guide\n\nOld text'}
      />,
    );

    expect(screen.getByRole('button', { name: 'Compare with guide.v1.md' })).toBeInTheDocument();
    expect(screen.queryByTestId('diff-viewer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Compare with guide.v1.md' }));

    const diffViewer = screen.getByTestId('diff-viewer');
    expect(diffViewer).toBeInTheDocument();
    expect(diffViewer).toHaveTextContent('old:# Guide Old text');
    expect(diffViewer).toHaveTextContent('new:# Guide New text');
    expect(diffViewerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hideSummary: true,
        showDiffOnly: false,
        splitView: true,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Use unified diff view' }));

    expect(diffViewerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hideSummary: true,
        showDiffOnly: false,
        splitView: false,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Show rendered preview' }));

    expect(screen.queryByTestId('diff-viewer')).not.toBeInTheDocument();
  });
});
