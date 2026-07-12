import {
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ElementType,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import ReactDiffViewer from 'react-diff-viewer-continued';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import '../styles/markdown.css';
import { SelectionPopover } from './SelectionPopover';
import { CommentList, Comment } from './CommentList';
import { MermaidBlock } from './MermaidBlock';
import { useDarkMode } from '../hooks/useDarkMode';
import { useResizable } from '../hooks/useResizable';
import { parseMdContent } from '../lib/parseMdContent';
import { CreateCommentInput } from '../types/review';

type DiffViewerStyles = NonNullable<ComponentProps<typeof ReactDiffViewer>['styles']>;

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
  onAddCommentReply?: (id: string, file: string, body: string) => Promise<void> | void;
}

interface ProcessedCommentMarkerProps {
  line: number;
  comments: Comment[];
  label: string;
  top: number;
}

const EMPTY_COMMENTS: Comment[] = [];

const getCommentText = (comment: Comment) => comment.comment || comment.text || '';

const getStatusLabel = (status = 'resolved') =>
  ({
    open: 'Open',
    resolved: 'Resolved',
    partially_resolved: 'Partially resolved',
    unresolved: 'Unresolved',
    ignored: 'Ignored',
  })[status] || status;

const getStatusClassName = (status = 'resolved') => `status-${status.replace(/_/g, '-')}`;

const getStatusIconKind = (status = 'resolved') => {
  if (status === 'open') {
    return 'comment';
  }

  if (status === 'resolved') {
    return 'check';
  }

  return 'alert';
};

const diffThemeVariables = {
  diffViewerBackground: 'var(--bg-panel)',
  diffViewerColor: 'var(--text-primary)',
  addedBackground: 'var(--diff-added-bg)',
  addedColor: 'var(--text-primary)',
  removedBackground: 'var(--diff-removed-bg)',
  removedColor: 'var(--text-primary)',
  wordAddedBackground: 'var(--diff-word-added-bg)',
  wordRemovedBackground: 'var(--diff-word-removed-bg)',
  addedGutterBackground: 'var(--diff-added-gutter-bg)',
  removedGutterBackground: 'var(--diff-removed-gutter-bg)',
  gutterBackground: 'var(--bg-inset)',
  gutterBackgroundDark: 'var(--bg-tertiary)',
  highlightBackground: 'var(--bg-tertiary)',
  highlightGutterBackground: 'var(--bg-tertiary)',
  codeFoldGutterBackground: 'var(--bg-inset)',
  codeFoldBackground: 'var(--bg-tertiary)',
  emptyLineBackground: 'var(--bg-panel)',
  gutterColor: 'var(--text-tertiary)',
  addedGutterColor: 'var(--text-tertiary)',
  removedGutterColor: 'var(--text-tertiary)',
  codeFoldContentColor: 'var(--text-secondary)',
  diffViewerTitleBackground: 'var(--bg-elevated)',
  diffViewerTitleColor: 'var(--text-secondary)',
  diffViewerTitleBorderColor: 'var(--border-secondary)',
};

const diffViewerStyles: DiffViewerStyles = {
  variables: {
    light: diffThemeVariables,
    dark: diffThemeVariables,
  },
  diffContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  line: {
    wordBreak: 'break-word',
  },
  contentText: {
    color: 'var(--text-primary)',
  },
  marker: {
    color: 'var(--text-primary)',
  },
  titleBlock: {
    fontWeight: 500,
  },
};

const dedupeMarkerComments = (comments: Comment[]): Comment[] => {
  const seen = new Set<string>();
  return comments.filter((comment) => {
    const key = `${comment.file || ''}:${comment.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const areMarkerPositionsEqual = (
  currentPositions: Record<number, number>,
  nextPositions: Record<number, number>,
) => {
  const currentEntries = Object.entries(currentPositions);
  const nextEntries = Object.entries(nextPositions);

  if (currentEntries.length !== nextEntries.length) {
    return false;
  }

  return nextEntries.every(([line, top]) => currentPositions[Number(line)] === top);
};

const StatusMarkerIcon = ({ kind }: { kind: string }) => {
  if (kind === 'check') {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 12 4 4 10-10" />
      </svg>
    );
  }

  if (kind === 'alert') {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 7v6" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 8h10" />
      <path d="M7 12h6" />
      <path d="M5 4h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H9l-6 3V7a3 3 0 0 1 3-3Z" />
    </svg>
  );
};

const ProcessedCommentMarker = ({ line, comments, label, top }: ProcessedCommentMarkerProps) => {
  const [open, setOpen] = useState(false);
  const markerRef = useRef<HTMLSpanElement>(null);
  const firstComment = comments[0];
  const markerStatus = firstComment.status || 'resolved';
  const markerIconKind = getStatusIconKind(markerStatus);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!markerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <span className="processed-comment-marker" ref={markerRef} style={{ top: `${top}px` }}>
      <button
        type="button"
        className={`processed-comment-marker-button ${getStatusClassName(markerStatus)}`}
        data-testid={`review-marker-${firstComment.id}`}
        data-status-icon={markerIconKind}
        aria-label={`${label} on line ${line}`}
        title={`${label} on line ${line}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <StatusMarkerIcon kind={markerIconKind} />
        {comments.length > 1 && <span className="processed-comment-count">{comments.length}</span>}
      </button>
      {open && (
        <span className="processed-comment-popover" role="dialog">
          {comments.map((comment) => {
            const sourceLabel = `${comment.file || 'source'}:${comment.startLine}`;

            return (
              <span
                key={`${comment.file || 'comment'}:${comment.id}`}
                className="processed-comment"
              >
                <span className="processed-comment-meta">
                  <span
                    className={`processed-comment-status ${getStatusClassName(comment.status)}`}
                  >
                    {getStatusLabel(comment.status)}
                  </span>
                  <span className="processed-comment-source" title={sourceLabel}>
                    {sourceLabel}
                  </span>
                </span>
                <span className="processed-comment-text">{getCommentText(comment)}</span>
                {comment.resolution && (
                  <span className="processed-comment-resolution">{comment.resolution}</span>
                )}
              </span>
            );
          })}
        </span>
      )}
    </span>
  );
};

const createComponentsWithLinePosition = (markerLines: Set<number>): Components => {
  const withLineMarker = (
    Tag: ElementType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { node, children, ...props }: any,
  ) => {
    const line = node?.position?.start?.line;
    const hasMarker = typeof line === 'number' && markerLines.has(line);
    const className = [props.className, hasMarker ? 'markdown-line-with-processed-comment' : null]
      .filter(Boolean)
      .join(' ');

    return (
      <Tag {...props} data-line-start={line} className={className || undefined}>
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
    pre: (props: any) => {
      const codeClassNames = props.node?.children?.[0]?.properties?.className;
      const isMermaid =
        Array.isArray(codeClassNames) && codeClassNames.includes('language-mermaid');
      const className = [props.className, isMermaid ? 'mermaid-pre' : null]
        .filter(Boolean)
        .join(' ');

      return withLineMarker('pre', { ...props, className: className || undefined });
    },
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
  targetComments = EMPTY_COMMENTS,
  readonly = false,
  onCreateComment,
  onDeleteComment,
  onDeleteAllComments,
  onEditComment,
  onAddCommentReply,
}: MarkdownPreviewProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeDiffKey, setActiveDiffKey] = useState<string | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('unified');
  const [markerPositions, setMarkerPositions] = useState<Record<number, number>>({});
  const { isDark } = useDarkMode();
  const { frontmatter, body, bodyLineOffset } = parseMdContent(content, filename);
  const frontmatterEntries = Object.entries(frontmatter);
  const canCompare = Boolean(compareFilename && typeof compareContent === 'string');
  const diffKey = canCompare ? `${compareFilename}->${filename}` : null;
  const showDiff = Boolean(diffKey && activeDiffKey === diffKey);
  const targetCommentsByLine = useMemo(() => {
    const next = new Map<number, Comment[]>();

    for (const comment of targetComments) {
      if (typeof comment.targetStartLine !== 'number') {
        continue;
      }

      const renderedLine = comment.targetStartLine - bodyLineOffset;
      const commentsForLine = next.get(renderedLine) || [];
      commentsForLine.push(comment);
      next.set(renderedLine, commentsForLine);
    }

    return next;
  }, [bodyLineOffset, targetComments]);
  const sourceCommentsByLine = useMemo(() => {
    const next = new Map<number, Comment[]>();

    for (const comment of comments) {
      if (comment.status === 'ignored' || typeof comment.startLine !== 'number') {
        continue;
      }

      const commentsForLine = next.get(comment.startLine) || [];
      commentsForLine.push(comment);
      next.set(comment.startLine, commentsForLine);
    }

    return next;
  }, [comments]);
  const markerGroups = useMemo(() => {
    const lines = new Set<number>([...targetCommentsByLine.keys(), ...sourceCommentsByLine.keys()]);

    return [...lines]
      .sort((a, b) => a - b)
      .map((line) => {
        const sourceComments = sourceCommentsByLine.get(line) || [];
        const targetComments = targetCommentsByLine.get(line) || [];
        const lineComments = dedupeMarkerComments([...sourceComments, ...targetComments]);

        return {
          line,
          comments: lineComments,
          label: sourceComments.length > 0 ? 'Review comments' : 'Processed comments',
        };
      })
      .filter((group) => group.comments.length > 0);
  }, [sourceCommentsByLine, targetCommentsByLine]);
  const markerLines = useMemo(
    () => new Set(markerGroups.map((group) => group.line)),
    [markerGroups],
  );
  const componentsWithLinePosition = useMemo(
    () => createComponentsWithLinePosition(markerLines),
    [markerLines],
  );
  const openCommentCount = useMemo(
    () => comments.filter((comment) => (comment.status || 'open') === 'open').length,
    [comments],
  );
  const previousOpenCommentCountRef = useRef(openCommentCount);
  const documentKey = filePath || filename;
  const documentMeta = 'Markdown preview · local review';
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
    initialCollapsed: openCommentCount === 0,
  });

  useEffect(() => {
    const previousOpenCommentCount = previousOpenCommentCountRef.current;
    previousOpenCommentCountRef.current = openCommentCount;

    if (previousOpenCommentCount === 0 && openCommentCount > 0) {
      setIsCollapsed(false);
    } else if (previousOpenCommentCount > 0 && openCommentCount === 0) {
      setIsCollapsed(true);
    }
  }, [openCommentCount, setIsCollapsed]);

  useLayoutEffect(() => {
    if (showDiff || markerGroups.length === 0) {
      return;
    }

    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }

    let frameId = 0;

    const updateMarkerPositions = () => {
      const contentRect = contentElement.getBoundingClientRect();
      const nextPositions: Record<number, number> = {};

      for (const group of markerGroups) {
        const lineElement = contentElement.querySelector<HTMLElement>(
          `[data-line-start="${group.line}"]`,
        );
        if (!lineElement) {
          continue;
        }

        const lineRect = lineElement.getBoundingClientRect();
        nextPositions[group.line] = lineRect.top - contentRect.top + lineRect.height / 2;
      }

      setMarkerPositions((currentPositions) =>
        areMarkerPositionsEqual(currentPositions, nextPositions) ? currentPositions : nextPositions,
      );
    };

    const scheduleMarkerPositionUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateMarkerPositions);
    };

    scheduleMarkerPositionUpdate();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(scheduleMarkerPositionUpdate)
        : null;
    resizeObserver?.observe(contentElement);
    window.addEventListener('resize', scheduleMarkerPositionUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleMarkerPositionUpdate);
    };
  }, [body, markerGroups, showDiff]);

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

  const handleAddCommentReply = (id: string, body: string) => {
    if (!onAddCommentReply || readonly) return;
    onAddCommentReply(id, filePath || filename, body);
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
      style={{ '--comments-sidebar-width': `${commentsSidebarWidth}px` } as CSSProperties}
    >
      <div className={`markdown-container ${showDiff ? 'diff-active' : ''}`}>
        <header className="markdown-header">
          <div className="markdown-title-row">
            <h1>{filename}</h1>
            {canCompare && (
              <div className="markdown-view-actions">
                <div className="markdown-view-switch" role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={`view-mode-button ${!showDiff ? 'active' : ''}`}
                    data-testid="view-mode-preview"
                    aria-label="Show preview"
                    aria-pressed={!showDiff}
                    onClick={() => setActiveDiffKey(null)}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className={`view-mode-button ${showDiff ? 'active' : ''}`}
                    data-testid="view-mode-diff"
                    aria-label="Show diff"
                    aria-pressed={showDiff}
                    title={`Show diff from ${compareFilename}`}
                    onClick={() => setActiveDiffKey(diffKey)}
                  >
                    Diff
                  </button>
                </div>
                {showDiff && (
                  <div className="diff-view-toolbar" aria-label="Diff view mode">
                    <button
                      type="button"
                      className={`diff-view-mode-button ${diffViewMode === 'unified' ? 'active' : ''}`}
                      data-testid="diff-layout-unified"
                      aria-label="Use single-column diff view"
                      aria-pressed={diffViewMode === 'unified'}
                      onClick={() => setDiffViewMode('unified')}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      className={`diff-view-mode-button ${diffViewMode === 'split' ? 'active' : ''}`}
                      data-testid="diff-layout-split"
                      aria-label="Use two-column diff view"
                      aria-pressed={diffViewMode === 'split'}
                      onClick={() => setDiffViewMode('split')}
                    >
                      Split
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <div className="markdown-reader-scroll">
          <section className="markdown-reader">
            {showDiff && canCompare ? (
              <div className="markdown-diff-view">
                <ReactDiffViewer
                  key={`${diffKey}:${isDark ? 'dark' : 'light'}`}
                  oldValue={compareContent || ''}
                  newValue={content}
                  splitView={diffViewMode === 'split'}
                  hideSummary
                  showDiffOnly={false}
                  useDarkTheme={isDark}
                  styles={diffViewerStyles}
                  leftTitle={compareFilename}
                  rightTitle={filename}
                />
              </div>
            ) : (
              <div className="markdown-content" ref={contentRef}>
                <div className="document-meta">
                  <span>{documentMeta}</span>
                  {frontmatterEntries.map(([key, value]) => (
                    <span key={key} className="document-meta-item">
                      {key}: {value}
                    </span>
                  ))}
                </div>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeHighlight]}
                  components={componentsWithLinePosition}
                >
                  {body}
                </ReactMarkdown>
                {markerGroups.length > 0 && (
                  <div className="processed-comment-marker-layer">
                    {markerGroups.map((group) => {
                      const top = markerPositions[group.line];
                      if (typeof top !== 'number') {
                        return null;
                      }

                      return (
                        <ProcessedCommentMarker
                          key={group.line}
                          line={group.line}
                          comments={group.comments}
                          label={group.label}
                          top={top}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!showDiff && !readonly && (
              <SelectionPopover containerRef={contentRef} onSubmitComment={handleSubmitComment} />
            )}
          </section>
        </div>
      </div>
      {isCollapsed && (
        <aside className="comments-sidebar comments-sidebar-collapsed">
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
            {openCommentCount > 0 && <span className="comments-badge">{openCommentCount}</span>}
          </button>
        </aside>
      )}
      {!isCollapsed && (
        <aside className="comments-sidebar" style={{ width: `${commentsSidebarWidth}px` }}>
          <div className="comments-sidebar-resizer" onMouseDown={handleMouseDown} />
          <CommentList
            key={documentKey}
            comments={[...comments].sort((a, b) => a.startLine - b.startLine)}
            filename={documentKey}
            onDeleteComment={!readonly ? handleDeleteComment : undefined}
            onDeleteAll={!readonly ? handleDeleteAllComments : undefined}
            onClose={toggleCollapse}
            onLineClick={handleLineClick}
            onEditComment={!readonly ? handleEditComment : undefined}
            onAddReply={!readonly ? handleAddCommentReply : undefined}
          />
        </aside>
      )}
    </div>
  );
};
