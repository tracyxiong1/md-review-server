import { useRef, useEffect, useMemo, useState, type ElementType } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import ReactDiffViewer from 'react-diff-viewer-continued';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import '../styles/markdown.css';
import { SelectionPopover } from './SelectionPopover';
import { CommentList, Comment } from './CommentList';
import { MermaidBlock } from './MermaidBlock';
import { useDarkMode } from '../hooks/useDarkMode';
import { useResizable } from '../hooks/useResizable';
import { parseMdContent } from '../lib/parseMdContent';
import { CreateCommentInput } from '../types/review';

interface MarkdownPreviewProps {
  content: string;
  filename: string;
  filePath?: string;
  compareFilename?: string;
  compareContent?: string;
  comments: Comment[];
  targetComments?: Comment[];
  readonly?: boolean;
  onCreateComment?: (input: CreateCommentInput) => Promise<void> | void;
  onDeleteComment?: (id: string, file: string) => Promise<void> | void;
  onDeleteAllComments?: (file: string) => Promise<void> | void;
  onEditComment?: (id: string, file: string, comment: string) => Promise<void> | void;
}

interface ProcessedCommentMarkerProps {
  line: number;
  comments: Comment[];
}

const getCommentText = (comment: Comment) => comment.comment || comment.text || '';

const getStatusLabel = (status = 'resolved') =>
  ({
    resolved: 'Resolved',
    partially_resolved: 'Partially resolved',
    unresolved: 'Unresolved',
  })[status] || status;

const getStatusClassName = (status = 'resolved') => `status-${status.replace(/_/g, '-')}`;

const ProcessedCommentMarker = ({ line, comments }: ProcessedCommentMarkerProps) => {
  const [open, setOpen] = useState(false);
  const markerRef = useRef<HTMLSpanElement>(null);
  const firstComment = comments[0];
  const markerStatus = firstComment.status || 'resolved';

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!markerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <span className="processed-comment-marker" ref={markerRef}>
      <button
        type="button"
        className={`processed-comment-marker-button ${getStatusClassName(markerStatus)}`}
        aria-label={`Processed comments on line ${line}`}
        title={`Processed comments on line ${line}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
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
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h7" />
          <path d="m16 8 2 2 4-4" />
        </svg>
        {comments.length > 1 && <span className="processed-comment-count">{comments.length}</span>}
      </button>
      {open && (
        <span className="processed-comment-popover" role="dialog">
          {comments.map((comment) => (
            <span key={`${comment.file || 'comment'}:${comment.id}`} className="processed-comment">
              <span className="processed-comment-meta">
                <span className={`processed-comment-status ${getStatusClassName(comment.status)}`}>
                  {getStatusLabel(comment.status)}
                </span>
                <span className="processed-comment-source">
                  {comment.file || 'source'}:{comment.startLine}
                </span>
              </span>
              <span className="processed-comment-text">{getCommentText(comment)}</span>
              {comment.resolution && (
                <span className="processed-comment-resolution">{comment.resolution}</span>
              )}
            </span>
          ))}
        </span>
      )}
    </span>
  );
};

const createComponentsWithLinePosition = (
  targetCommentsByLine: Map<number, Comment[]>,
): Components => {
  const renderMarker = (line?: number) => {
    if (typeof line !== 'number') {
      return null;
    }

    const comments = targetCommentsByLine.get(line);
    if (!comments?.length) {
      return null;
    }

    return <ProcessedCommentMarker line={line} comments={comments} />;
  };

  const withLineMarker = (
    Tag: ElementType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { node, children, ...props }: any,
  ) => {
    const line = node?.position?.start?.line;
    const marker = renderMarker(line);
    const className = [props.className, marker ? 'markdown-line-with-processed-comment' : null]
      .filter(Boolean)
      .join(' ');

    return (
      <Tag {...props} data-line-start={line} className={className || undefined}>
        {marker}
        {children}
      </Tag>
    );
  };

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    code: ({ node, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      // Render mermaid diagrams
      if (language === 'mermaid') {
        const code = String(children).replace(/\n$/, '');
        return <MermaidBlock code={code} />;
      }

      // Default code rendering
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: (props: any) => withLineMarker('p', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: (props: any) => withLineMarker('h1', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: (props: any) => withLineMarker('h2', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3: (props: any) => withLineMarker('h3', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h4: (props: any) => withLineMarker('h4', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h5: (props: any) => withLineMarker('h5', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h6: (props: any) => withLineMarker('h6', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: (props: any) => withLineMarker('li', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockquote: (props: any) => withLineMarker('blockquote', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pre: (props: any) => withLineMarker('pre', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    td: (props: any) => withLineMarker('td', props),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    th: (props: any) => withLineMarker('th', props),
  };
};

export const MarkdownPreview = ({
  content,
  filename,
  filePath,
  compareFilename,
  compareContent,
  comments,
  targetComments = [],
  readonly = false,
  onCreateComment,
  onDeleteComment,
  onDeleteAllComments,
  onEditComment,
}: MarkdownPreviewProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousCommentCountRef = useRef(comments.length);
  const [activeDiffKey, setActiveDiffKey] = useState<string | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('split');
  const { isDark } = useDarkMode();
  const { frontmatter, body } = parseMdContent(content, filename);
  const canCompare = Boolean(compareFilename && typeof compareContent === 'string');
  const diffKey = canCompare ? `${compareFilename}->${filename}` : null;
  const showDiff = Boolean(diffKey && activeDiffKey === diffKey);
  const targetCommentsByLine = useMemo(() => {
    const next = new Map<number, Comment[]>();

    for (const comment of targetComments) {
      if (typeof comment.targetStartLine !== 'number') {
        continue;
      }

      const commentsForLine = next.get(comment.targetStartLine) || [];
      commentsForLine.push(comment);
      next.set(comment.targetStartLine, commentsForLine);
    }

    return next;
  }, [targetComments]);
  const componentsWithLinePosition = useMemo(
    () => createComponentsWithLinePosition(targetCommentsByLine),
    [targetCommentsByLine],
  );
  const {
    width: commentsSidebarWidth,
    isResizing,
    isCollapsed,
    setIsCollapsed,
    handleMouseDown,
    toggleCollapse,
  } = useResizable({
    initialWidth: 300,
    minWidth: 250,
    maxWidth: 600,
    storageKey: 'md-review-comments-sidebar-width',
    direction: 'right',
    collapsible: true,
    collapseThreshold: 70,
    initialCollapsed: comments.length === 0,
  });

  // Update highlight.js theme based on dark mode
  useEffect(() => {
    const lightTheme = document.querySelector('link[href*="github.css"]');
    const darkTheme = document.querySelector('link[href*="github-dark.css"]');

    if (lightTheme && darkTheme) {
      if (isDark) {
        (lightTheme as HTMLLinkElement).disabled = true;
        (darkTheme as HTMLLinkElement).disabled = false;
      } else {
        (lightTheme as HTMLLinkElement).disabled = false;
        (darkTheme as HTMLLinkElement).disabled = true;
      }
    }
  }, [isDark]);

  useEffect(() => {
    const previousCommentCount = previousCommentCountRef.current;
    previousCommentCountRef.current = comments.length;

    if (previousCommentCount === 0 && comments.length > 0) {
      setIsCollapsed(false);
    }
  }, [comments.length, setIsCollapsed]);

  const handleSubmitComment = (
    comment: string,
    selectedText: string,
    startLine: number,
    endLine: number,
    startOffset?: number,
    endOffset?: number,
    beforeText?: string,
    afterText?: string,
  ) => {
    if (!onCreateComment || readonly) return;

    onCreateComment({
      file: filePath || filename,
      comment,
      selectedText,
      startLine,
      endLine,
      startOffset,
      endOffset,
      beforeText,
      afterText,
    });
  };

  const handleDeleteComment = (id: string) => {
    if (!onDeleteComment || readonly) return;
    onDeleteComment(id, filePath || filename);
  };

  const handleDeleteAllComments = () => {
    if (!onDeleteAllComments || readonly) return;
    onDeleteAllComments(filePath || filename);
  };

  const handleEditComment = (id: string, newText: string) => {
    if (!onEditComment || readonly) return;
    onEditComment(id, filePath || filename, newText);
  };

  const handleLineClick = (line: number) => {
    if (!contentRef.current) return;

    // Find the element with the matching line number
    const element = contentRef.current.querySelector(`[data-line-start="${line}"]`);
    if (element) {
      // Scroll to the element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight animation
      element.classList.add('highlight-line');
      setTimeout(() => {
        element.classList.remove('highlight-line');
      }, 2000);
    }
  };

  return (
    <div
      className={`markdown-with-comments ${isResizing ? 'resizing' : ''} ${isCollapsed ? 'comments-collapsed' : ''}`}
      style={{ paddingRight: isCollapsed ? '80px' : `${commentsSidebarWidth + 20}px` }}
    >
      <div className={`markdown-container ${showDiff ? 'diff-active' : ''}`}>
        <header className="markdown-header">
          <div className="markdown-title-row">
            <h1>{filename}</h1>
            {canCompare && (
              <button
                type="button"
                className="diff-toggle-button"
                aria-label={showDiff ? 'Show rendered preview' : `Compare with ${compareFilename}`}
                title={showDiff ? 'Show rendered preview' : `Compare with ${compareFilename}`}
                onClick={() => setActiveDiffKey(showDiff ? null : diffKey)}
              >
                {showDiff ? 'Preview' : 'Compare'}
              </button>
            )}
          </div>
          {Object.keys(frontmatter).length > 0 && (
            <dl className="frontmatter-block">
              {Object.entries(frontmatter).map(([key, value]) => (
                <div key={key} className="frontmatter-row">
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </header>
        {showDiff && canCompare ? (
          <div className="markdown-diff-view">
            <div className="diff-view-toolbar" aria-label="Diff view mode">
              <button
                type="button"
                className={`diff-view-mode-button ${diffViewMode === 'split' ? 'active' : ''}`}
                aria-label="Use split diff view"
                aria-pressed={diffViewMode === 'split'}
                onClick={() => setDiffViewMode('split')}
              >
                Split
              </button>
              <button
                type="button"
                className={`diff-view-mode-button ${diffViewMode === 'unified' ? 'active' : ''}`}
                aria-label="Use unified diff view"
                aria-pressed={diffViewMode === 'unified'}
                onClick={() => setDiffViewMode('unified')}
              >
                Unified
              </button>
            </div>
            <ReactDiffViewer
              oldValue={compareContent || ''}
              newValue={content}
              splitView={diffViewMode === 'split'}
              hideSummary
              showDiffOnly={false}
              useDarkTheme={isDark}
              leftTitle={compareFilename}
              rightTitle={filename}
            />
          </div>
        ) : (
          <div className="markdown-content" ref={contentRef}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeHighlight]}
              components={componentsWithLinePosition}
            >
              {body}
            </ReactMarkdown>
          </div>
        )}
        {!showDiff && !readonly && (
          <SelectionPopover containerRef={contentRef} onSubmitComment={handleSubmitComment} />
        )}
      </div>
      {isCollapsed && (
        <button
          className="comments-toggle-button"
          onClick={toggleCollapse}
          title="Show comments"
          aria-label="Show comments"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V5z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {comments.length > 0 && <span className="comments-badge">{comments.length}</span>}
        </button>
      )}
      {!isCollapsed && (
        <aside className="comments-sidebar" style={{ width: `${commentsSidebarWidth}px` }}>
          <div className="comments-sidebar-resizer" onMouseDown={handleMouseDown} />
          <CommentList
            comments={[...comments].sort((a, b) => a.startLine - b.startLine)}
            filename={filePath || filename}
            onDeleteComment={!readonly ? handleDeleteComment : undefined}
            onDeleteAll={!readonly ? handleDeleteAllComments : undefined}
            onClose={toggleCollapse}
            onLineClick={handleLineClick}
            onEditComment={!readonly ? handleEditComment : undefined}
          />
        </aside>
      )}
    </div>
  );
};
