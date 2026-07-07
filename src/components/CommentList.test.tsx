import { render, screen } from '@testing-library/react';
import { type UserEvent, userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { CommentList, Comment } from './CommentList';

describe('CommentList', () => {
  let user: UserEvent;

  const mockComments: Comment[] = [
    {
      id: '1',
      text: 'First comment',
      selectedText: 'selected text 1',
      startLine: 1,
      endLine: 1,
      status: 'open',
      createdAt: new Date('2025-01-01'),
    },
    {
      id: '2',
      text: 'Second comment',
      selectedText: 'selected text 2',
      startLine: 5,
      endLine: 10,
      status: 'resolved',
      createdAt: new Date('2025-01-02'),
    },
  ];

  beforeAll(() => {
    user = userEvent.setup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display open comments by default', async () => {
    render(<CommentList comments={mockComments} filename="test.md" />);

    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.queryByText('Second comment')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2 comments' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All 2' }));

    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });

  it('should display empty state when no comments', () => {
    render(<CommentList comments={[]} filename="test.md" />);

    expect(screen.getByText('No comments yet')).toBeInTheDocument();
    expect(screen.getByText('Select text to add a comment')).toBeInTheDocument();
  });

  it('should call onDeleteComment when delete button is clicked', async () => {
    const onDeleteComment = vi.fn();

    render(
      <CommentList comments={mockComments} filename="test.md" onDeleteComment={onDeleteComment} />,
    );

    const deleteButtons = screen.getAllByRole('button', { name: '×' });
    await user.click(deleteButtons[0]);

    expect(onDeleteComment).toHaveBeenCalledWith('1');
  });

  it('should call onDeleteAll when delete all button is clicked', async () => {
    const onDeleteAll = vi.fn();

    render(<CommentList comments={mockComments} filename="test.md" onDeleteAll={onDeleteAll} />);

    const deleteAllButton = screen.getByRole('button', { name: 'Clear' });
    await user.click(deleteAllButton);

    expect(onDeleteAll).toHaveBeenCalledTimes(1);
  });

  it('should copy comment to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator.clipboard, { writeText: writeTextMock });

    render(<CommentList comments={mockComments} filename="test.md" />);

    const copyButtons = screen.getAllByTitle('Copy comment');
    await user.click(copyButtons[0]);

    expect(writeTextMock).toHaveBeenCalledWith('test.md:L1\nFirst comment');
  });

  it('should copy all comments when copy all button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator.clipboard, { writeText: writeTextMock });

    render(<CommentList comments={mockComments} filename="test.md" />);

    const copyAllButton = screen.getByRole('button', { name: 'Copy All' });
    await user.click(copyAllButton);

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('First comment'));
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('Second comment'));
  });

  it('should call onLineClick when line number is clicked', async () => {
    const onLineClick = vi.fn();

    render(<CommentList comments={mockComments} filename="test.md" onLineClick={onLineClick} />);

    const lineButton = screen.getByRole('button', { name: 'Line 1' });
    await user.click(lineButton);

    expect(onLineClick).toHaveBeenCalledWith(1);
  });

  it('should display line range when comment spans multiple lines after switching to all', async () => {
    render(<CommentList comments={mockComments} filename="test.md" />);

    await user.click(screen.getByRole('button', { name: 'All 2' }));

    expect(screen.getByRole('button', { name: 'Line 5-10' })).toBeInTheDocument();
  });

  it('should display comment status labels', async () => {
    render(<CommentList comments={mockComments} filename="test.md" />);

    expect(screen.getByText('Open')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All 2' }));

    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('should filter comments by status tab', async () => {
    render(<CommentList comments={mockComments} filename="test.md" />);

    await user.click(screen.getByRole('button', { name: 'Open 1' }));
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.queryByText('Second comment')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Done 1' }));
    expect(screen.queryByText('First comment')).not.toBeInTheDocument();
    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });

  it('should display replies and submit a user reply', async () => {
    const onAddReply = vi.fn();
    const commentsWithReplies: Comment[] = [
      {
        ...mockComments[0],
        replies: [
          {
            id: 'r001',
            author: 'codex',
            body: '我不确定你是希望解释流程，还是调整文档表述。',
            createdAt: '2026-07-06T00:00:00Z',
          },
        ],
      },
    ];

    render(
      <CommentList comments={commentsWithReplies} filename="test.md" onAddReply={onAddReply} />,
    );

    expect(screen.getByText('Codex')).toBeInTheDocument();
    expect(screen.getByText('我不确定你是希望解释流程，还是调整文档表述。')).toBeInTheDocument();
    expect(screen.getByText('你')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Reply to comment on line 1'), '请按修改文档处理。');
    await user.click(screen.getByRole('button', { name: 'Reply' }));

    expect(onAddReply).toHaveBeenCalledWith('1', '请按修改文档处理。');
  });

  it('should format reply authors and relative or absolute reply times', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T10:30:00+08:00'));
    const olderReplyDate = new Date('2026-07-07T09:05:00+08:00');
    const expectedOlderReplyTime = `${olderReplyDate.getMonth() + 1}月${olderReplyDate.getDate()}日 ${String(
      olderReplyDate.getHours(),
    ).padStart(2, '0')}:${String(olderReplyDate.getMinutes()).padStart(2, '0')}`;
    const commentsWithReplies: Comment[] = [
      {
        ...mockComments[0],
        replies: [
          {
            id: 'r001',
            author: 'codex',
            body: '刚才补充的说明。',
            createdAt: '2026-07-08T10:25:00+08:00',
          },
          {
            id: 'r002',
            author: 'user',
            body: '昨天的追问。',
            createdAt: '2026-07-07T09:05:00+08:00',
          },
        ],
      },
    ];

    render(<CommentList comments={commentsWithReplies} filename="test.md" />);

    expect(screen.getByText('Codex')).toBeInTheDocument();
    expect(screen.getByText('你')).toBeInTheDocument();
    expect(screen.getByText('5分钟前')).toBeInTheDocument();
    expect(screen.getByText(expectedOlderReplyTime)).toBeInTheDocument();
  });

  it('should append a user comment to a done comment from the comments panel', async () => {
    const onAddReply = vi.fn();

    render(<CommentList comments={mockComments} filename="test.md" onAddReply={onAddReply} />);

    await user.click(screen.getByRole('button', { name: 'Done 1' }));
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    await user.type(screen.getByLabelText('Reply to comment on line 5'), '这个点我再补充一下。');
    await user.click(screen.getByRole('button', { name: 'Reply' }));

    expect(onAddReply).toHaveBeenCalledWith('2', '这个点我再补充一下。');
  });

  it('should enter edit mode when edit button is clicked', async () => {
    const onEditComment = vi.fn();

    render(
      <CommentList comments={mockComments} filename="test.md" onEditComment={onEditComment} />,
    );

    const editButtons = screen.getAllByTitle('Edit comment');
    await user.click(editButtons[0]);

    expect(screen.getByDisplayValue('First comment')).toBeInTheDocument();
  });

  it('should call onEditComment when save button is clicked in edit mode', async () => {
    const onEditComment = vi.fn();

    render(
      <CommentList comments={mockComments} filename="test.md" onEditComment={onEditComment} />,
    );

    const editButtons = screen.getAllByTitle('Edit comment');
    await user.click(editButtons[0]);

    const textarea = screen.getByDisplayValue('First comment');
    await user.clear(textarea);
    await user.type(textarea, 'Updated comment');

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    expect(onEditComment).toHaveBeenCalledWith('1', 'Updated comment');
  });

  it('should exit edit mode when cancel button is clicked', async () => {
    const onEditComment = vi.fn();

    render(
      <CommentList comments={mockComments} filename="test.md" onEditComment={onEditComment} />,
    );

    const editButtons = screen.getAllByTitle('Edit comment');
    await user.click(editButtons[0]);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(screen.queryByDisplayValue('First comment')).not.toBeInTheDocument();
  });

  it('should call onClose when hide button is clicked', async () => {
    const onClose = vi.fn();

    render(<CommentList comments={mockComments} filename="test.md" onClose={onClose} />);

    const hideButton = screen.getByRole('button', { name: 'Hide comments' });
    await user.click(hideButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should truncate long selected text', () => {
    const longComment: Comment = {
      id: '3',
      text: 'Comment',
      selectedText: 'a'.repeat(100),
      startLine: 1,
      endLine: 1,
      status: 'open',
      createdAt: new Date(),
    };

    render(<CommentList comments={[longComment]} filename="test.md" />);

    expect(screen.getByText('"' + 'a'.repeat(50) + '..."')).toBeInTheDocument();
  });
});
