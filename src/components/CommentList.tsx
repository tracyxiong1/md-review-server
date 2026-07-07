import { useEffect, useState } from 'react';
import { ReviewCommentReply, ReviewCommentStatus } from '../types/review';

export interface Comment {
  id: string;
  comment?: string;
  text?: string;
  selectedText: string;
  startLine: number;
  endLine: number;
  status?: ReviewCommentStatus;
  file?: string;
  targetFile?: string;
  targetStartLine?: number;
  targetEndLine?: number;
  targetSelectedText?: string;
  resolution?: string;
  replies?: ReviewCommentReply[];
  createdAt: Date | string;
}

interface CommentListProps {
  comments: Comment[];
  filename: string;
  onDeleteComment?: (id: string) => void;
  onDeleteAll?: () => void;
  onClose?: () => void;
  onLineClick?: (line: number) => void;
  onEditComment?: (id: string, newText: string) => void;
  onAddReply?: (id: string, body: string) => Promise<void> | void;
}

type CommentFilter = 'open' | 'done' | 'all';

const formatReplyTime = (createdAt: string, nowMs: number | null) => {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diffMs = nowMs === null ? -1 : nowMs - timestamp;
  if (diffMs >= 0 && diffMs < 60_000) {
    return '刚刚';
  }
  if (diffMs >= 0 && diffMs < 60 * 60_000) {
    return `${Math.floor(diffMs / 60_000)}分钟前`;
  }
  if (diffMs >= 0 && diffMs < 24 * 60 * 60_000) {
    return `${Math.floor(diffMs / (60 * 60_000))}小时前`;
  }

  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  const monthDayTime = `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
  const currentYear = new Date(nowMs ?? timestamp).getFullYear();
  return date.getFullYear() === currentYear
    ? monthDayTime
    : `${date.getFullYear()}年${monthDayTime}`;
};

export const CommentList = ({
  comments,
  filename,
  onDeleteComment,
  onDeleteAll,
  onClose,
  onLineClick,
  onEditComment,
  onAddReply,
}: CommentListProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTextById, setReplyTextById] = useState<Record<string, string>>({});
  const [commentFilter, setCommentFilter] = useState<CommentFilter>('open');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const openCount = comments.filter((comment) => (comment.status || 'open') === 'open').length;
  const doneCount = comments.length - openCount;
  const visibleComments = comments.filter((comment) => {
    if (commentFilter === 'all') return true;
    const status = comment.status || 'open';
    return commentFilter === 'open' ? status === 'open' : status !== 'open';
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const getCommentText = (comment: Comment) => comment.comment || comment.text || '';

  const getStatusLabel = (status: ReviewCommentStatus = 'open') =>
    ({
      open: 'Open',
      resolved: 'Resolved',
      partially_resolved: 'Partially resolved',
      unresolved: 'Unresolved',
      ignored: 'Ignored',
    })[status];
  const getStatusClassName = (status: ReviewCommentStatus = 'open') =>
    `status-${status.replace(/_/g, '-')}`;

  const getReplyAuthorLabel = (author: ReviewCommentReply['author']) =>
    author === 'codex' ? 'Codex' : '你';

  const formatComment = (comment: Comment) => {
    const lineRange =
      comment.startLine === comment.endLine
        ? `L${comment.startLine}`
        : `L${comment.startLine}-${comment.endLine}`;
    const replies = comment.replies?.length
      ? `\n\nReplies:\n${comment.replies
          .map((reply) => `${getReplyAuthorLabel(reply.author)}: ${reply.body}`)
          .join('\n')}`
      : '';
    return `${filename}:${lineRange}\n${getCommentText(comment)}${replies}`;
  };

  const handleCopyComment = async (comment: Comment) => {
    try {
      await navigator.clipboard.writeText(formatComment(comment));
      setCopiedId(comment.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyAll = async () => {
    const text = comments.map(formatComment).join('\n------------------------------------\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(getCommentText(comment));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSaveEdit = (id: string) => {
    if (editText.trim() && onEditComment) {
      onEditComment(id, editText.trim());
      setEditingId(null);
      setEditText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleReplyTextChange = (id: string, value: string) => {
    setReplyTextById((current) => ({
      ...current,
      [id]: value,
    }));
  };

  const handleCancelReply = (id: string) => {
    setReplyTextById((current) => ({
      ...current,
      [id]: '',
    }));
    setReplyingId((current) => (current === id ? null : current));
  };

  const handleSaveReply = async (id: string) => {
    const body = replyTextById[id]?.trim();
    if (!body || !onAddReply) {
      return;
    }

    await onAddReply(id, body);
    setCommentFilter('open');
    handleCancelReply(id);
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveReply(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelReply(id);
    }
  };

  return (
    <div className="comment-list">
      <div className="comments-top">
        <div className="comment-list-header">
          <h3 className="comment-list-title" aria-label={`${comments.length} comments`}>
            Comments
          </h3>
          {onClose && (
            <button
              className="comment-list-collapse-btn"
              onClick={onClose}
              title="Hide comments"
              aria-label="Hide comments"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
        <div className="comments-subtitle">Current file · anchored to selection</div>
        <div className="comment-tabs" aria-label="Comment status summary">
          <button
            type="button"
            className={commentFilter === 'open' ? 'active' : ''}
            aria-pressed={commentFilter === 'open'}
            onClick={() => setCommentFilter('open')}
          >
            Open {openCount}
          </button>
          <button
            type="button"
            className={commentFilter === 'done' ? 'active' : ''}
            aria-pressed={commentFilter === 'done'}
            onClick={() => setCommentFilter('done')}
          >
            Done {doneCount}
          </button>
          <button
            type="button"
            className={commentFilter === 'all' ? 'active' : ''}
            aria-pressed={commentFilter === 'all'}
            onClick={() => setCommentFilter('all')}
          >
            All {comments.length}
          </button>
        </div>
        {comments.length > 0 && (
          <div className="comment-list-actions">
            <button
              className={`comment-list-copy-all ${copiedAll ? 'copied' : ''}`}
              onClick={handleCopyAll}
              title={copiedAll ? 'Copied!' : 'Copy all comments'}
            >
              {copiedAll ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
              <span>Copy All</span>
            </button>
            {onDeleteAll && (
              <button
                className="comment-list-delete-all"
                onClick={onDeleteAll}
                title="Delete all comments"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </div>
      {comments.length === 0 ? (
        <div className="comment-list-empty">
          <p>No comments yet</p>
          <p className="comment-list-hint">Select text to add a comment</p>
        </div>
      ) : visibleComments.length === 0 ? (
        <div className="comment-list-empty">
          <p>No open comments</p>
          <p className="comment-list-hint">Resolved comments stay in Done and All</p>
        </div>
      ) : (
        <div className="comment-list-items">
          {visibleComments.map((comment, index) => {
            const hasReplies = Boolean(comment.replies?.length);
            const shouldShowReplyComposer = Boolean(
              onAddReply &&
              (replyingId === comment.id || ((comment.status || 'open') === 'open' && hasReplies)),
            );

            return (
              <div key={comment.id} className={`comment-item ${index === 0 ? 'active' : ''}`}>
                <div className="comment-item-header">
                  <div className="comment-item-meta">
                    <button
                      className="comment-item-lines"
                      onClick={() => onLineClick?.(comment.startLine)}
                      title="Jump to line"
                    >
                      Line{' '}
                      {comment.startLine === comment.endLine
                        ? comment.startLine
                        : `${comment.startLine}-${comment.endLine}`}
                    </button>
                    <span className={`comment-item-status ${getStatusClassName(comment.status)}`}>
                      {getStatusLabel(comment.status)}
                    </span>
                  </div>
                  <div className="comment-item-actions">
                    {onEditComment && editingId !== comment.id && (
                      <button
                        className="comment-item-edit"
                        onClick={() => handleStartEdit(comment)}
                        title="Edit comment"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    {onAddReply && editingId !== comment.id && (
                      <button
                        className="comment-item-reply"
                        onClick={() => setReplyingId(comment.id)}
                        title="Add comment"
                        aria-label="Add comment"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                          <path d="M8 10h8" />
                          <path d="M8 14h5" />
                        </svg>
                      </button>
                    )}
                    <button
                      className={`comment-item-copy ${copiedId === comment.id ? 'copied' : ''}`}
                      onClick={() => handleCopyComment(comment)}
                      title={copiedId === comment.id ? 'Copied!' : 'Copy comment'}
                    >
                      {copiedId === comment.id ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      )}
                    </button>
                    {onDeleteComment && (
                      <button
                        className="comment-item-delete"
                        onClick={() => onDeleteComment(comment.id)}
                        title="Delete comment"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <div className="comment-item-selection">
                  {'"'}
                  {comment.selectedText.length > 50
                    ? comment.selectedText.slice(0, 50) + '...'
                    : comment.selectedText}
                  {'"'}
                </div>
                {editingId === comment.id ? (
                  <div className="comment-edit-form">
                    <textarea
                      className="comment-edit-input"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, comment.id)}
                      rows={3}
                      autoFocus
                    />
                    <div className="comment-edit-actions">
                      <button className="comment-edit-cancel" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                      <button
                        className="comment-edit-save"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editText.trim()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="comment-item-text">{getCommentText(comment)}</div>
                )}
                {(hasReplies || shouldShowReplyComposer) && (
                  <div className="comment-reply-thread">
                    {comment.replies?.map((reply) => (
                      <div key={reply.id} className="comment-reply-row">
                        <div className="comment-reply-meta">
                          <span
                            className={`comment-reply-author ${
                              reply.author === 'codex' ? 'codex' : ''
                            }`}
                          >
                            {getReplyAuthorLabel(reply.author)}
                          </span>
                          <span className="comment-reply-time">
                            {formatReplyTime(reply.createdAt, nowMs)}
                          </span>
                        </div>
                        <div className="comment-reply-body">{reply.body}</div>
                      </div>
                    ))}
                    {shouldShowReplyComposer && (
                      <div className="comment-reply-composer">
                        <div className="comment-reply-label">你</div>
                        <div className="comment-reply-input">
                          <textarea
                            aria-label={`Reply to comment on line ${comment.startLine}`}
                            placeholder="Reply..."
                            value={replyTextById[comment.id] || ''}
                            onChange={(event) =>
                              handleReplyTextChange(comment.id, event.target.value)
                            }
                            onKeyDown={(event) => handleReplyKeyDown(event, comment.id)}
                            rows={2}
                          />
                          <div className="comment-reply-actions">
                            <button
                              className="comment-reply-cancel"
                              type="button"
                              onClick={() => handleCancelReply(comment.id)}
                            >
                              Cancel
                            </button>
                            <button
                              className="comment-reply-save"
                              type="button"
                              onClick={() => handleSaveReply(comment.id)}
                              disabled={!replyTextById[comment.id]?.trim()}
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="comment-list-footer-hint">
        页面只收集评论和展示状态。Codex skill 读取 open comments，生成下一版后回写结果。
      </div>
    </div>
  );
};
