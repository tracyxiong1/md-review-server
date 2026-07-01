import { useEffect, useRef, useState } from 'react';
import { useFileList } from '../hooks/useFileList';
import { useMarkdown } from '../hooks/useMarkdown';
import { useComments } from '../hooks/useComments';
import { useReviewSummary } from '../hooks/useReviewSummary';
import { useResizable } from '../hooks/useResizable';
import { useFileWatch } from '../hooks/useFileWatch';
import { FileTree } from './FileTree';
import { MarkdownPreview } from './MarkdownPreview';
import { ErrorDisplay } from './ErrorDisplay';
import { ThemeToggle } from './ThemeToggle';
import '../styles/devmode.css';

const VERSIONED_MARKDOWN_RE = /^(?<stem>.+?)(?:\.v(?<version>\d+))?(?<ext>\.md|\.markdown|\.mdx)$/;

function shouldCollapseSidebarByDefault() {
  return new URLSearchParams(window.location.search).has('file');
}

function parseMarkdownVersion(filePath: string) {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  const match = fileName.match(VERSIONED_MARKDOWN_RE);
  if (!match?.groups) {
    return null;
  }

  return {
    dir: parts.slice(0, -1).join('/'),
    stem: match.groups.stem,
    ext: match.groups.ext,
    version: Number(match.groups.version || 0),
  };
}

function isNewerVersionOfCurrentFile(currentFile: string | null, addedPath: string) {
  if (!currentFile) return false;

  const current = parseMarkdownVersion(currentFile);
  const added = parseMarkdownVersion(addedPath);
  if (!current || !added) return false;

  return (
    added.dir === current.dir &&
    added.stem === current.stem &&
    added.ext === current.ext &&
    added.version > current.version
  );
}

function findPreviousVersionFile(currentFile: string | null, files: { path: string }[]) {
  if (!currentFile) return null;

  const current = parseMarkdownVersion(currentFile);
  if (!current || current.version === 0) return null;

  let previousPath: string | null = null;
  let previousVersion = -1;

  for (const file of files) {
    if (file.path === currentFile) continue;

    const candidate = parseMarkdownVersion(file.path);
    if (!candidate) continue;

    const isSameDocument =
      candidate.dir === current.dir &&
      candidate.stem === current.stem &&
      candidate.ext === current.ext;
    if (!isSameDocument) continue;

    if (candidate.version < current.version && candidate.version > previousVersion) {
      previousPath = file.path;
      previousVersion = candidate.version;
    }
  }

  return previousPath;
}

export const DevModeApp = () => {
  const {
    files,
    selectedFile,
    setSelectedFile,
    reload: reloadFiles,
    loading: filesLoading,
    error: filesError,
  } = useFileList();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => !shouldCollapseSidebarByDefault());
  const [focusSearch, setFocusSearch] = useState<boolean>(false);
  const {
    content,
    filename,
    loading: markdownLoading,
    error: markdownError,
    reload,
  } = useMarkdown(selectedFile);
  const previousVersionFile = findPreviousVersionFile(selectedFile, files);
  const {
    content: previousVersionContent,
    filename: previousVersionFilename,
    loading: previousVersionLoading,
    error: previousVersionError,
  } = useMarkdown(previousVersionFile);
  const commentState = useComments(selectedFile);
  const { summary: reviewSummary, reload: reloadReviewSummary } = useReviewSummary(files);
  const didTrackActiveCommentsRef = useRef(false);

  const currentCommentSignature = commentState.comments
    .map((comment) => `${comment.id}:${comment.status}:${comment.updatedAt || comment.createdAt}`)
    .join('\n');

  useEffect(() => {
    if (!didTrackActiveCommentsRef.current) {
      didTrackActiveCommentsRef.current = true;
      return;
    }

    reloadReviewSummary();
  }, [currentCommentSignature, reloadReviewSummary]);

  // Watch for file changes and reload current file
  useFileWatch(
    (changedPath) => {
      reloadReviewSummary();
      if (selectedFile === changedPath) {
        reload();
        commentState.reload();
      }
    },
    (addedPath) => {
      reloadReviewSummary();
      reloadFiles(isNewerVersionOfCurrentFile(selectedFile, addedPath) ? addedPath : null);
    },
  );

  const {
    width: sidebarWidth,
    isResizing,
    isCollapsed: sidebarCollapsed,
    handleMouseDown,
    toggleCollapse,
  } = useResizable({
    initialWidth: 240,
    minWidth: 180,
    maxWidth: 500,
    storageKey: 'md-review-sidebar-width',
    collapsible: true,
    collapseThreshold: 120,
  });

  const handleSearchClick = () => {
    setSidebarOpen(true);
    setFocusSearch(true);
    setTimeout(() => setFocusSearch(false), 100);
  };

  if (filesLoading) {
    return (
      <div className="dev-loading">
        <p>Loading files...</p>
      </div>
    );
  }

  if (filesError) {
    return <ErrorDisplay error={filesError} />;
  }

  if (files.length === 0) {
    return (
      <div className="dev-empty">
        <h2>No Markdown Files Found</h2>
        <p>No .md files were found in the current directory.</p>
      </div>
    );
  }

  const effectiveSidebarOpen = sidebarOpen && !sidebarCollapsed;

  return (
    <div
      className={`dev-container ${!effectiveSidebarOpen ? 'sidebar-closed' : ''} ${isResizing ? 'resizing' : ''}`}
    >
      <div
        className={`dev-sidebar ${!effectiveSidebarOpen ? 'closed' : ''}`}
        style={effectiveSidebarOpen ? { width: `${sidebarWidth}px` } : undefined}
      >
        {!effectiveSidebarOpen && (
          <div className="sidebar-icon-bar">
            <button
              className="icon-bar-item"
              onClick={() => {
                setSidebarOpen(true);
                if (sidebarCollapsed) {
                  toggleCollapse();
                }
              }}
              title="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 3h6l2 2h4a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
            <button className="icon-bar-item" onClick={handleSearchClick} title="Search">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M13.5 13.5l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <ThemeToggle />
            <div className="icon-bar-spacer" />
            <a
              href="https://github.com/tracyxiong1/md-review-server"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-bar-item"
              title="View on GitHub"
              aria-label="View on GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        )}
        {effectiveSidebarOpen && (
          <>
            <div className="sidebar-content">
              <FileTree
                files={files}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                onToggleSidebar={() => setSidebarOpen(false)}
                autoFocusSearch={focusSearch}
                reviewSummary={reviewSummary}
              />
            </div>
            <div className="sidebar-resizer" onMouseDown={handleMouseDown} />
          </>
        )}
      </div>
      <div className="dev-main">
        {!selectedFile ? (
          <div className="dev-placeholder">
            <h2>Welcome to md-review</h2>
            <p>Select a markdown file from the sidebar to preview</p>
            <p className="file-count">{files.length} markdown files found</p>
          </div>
        ) : markdownLoading ? (
          <div className="dev-loading">
            <p>Loading markdown...</p>
          </div>
        ) : markdownError ? (
          <ErrorDisplay error={markdownError} />
        ) : content && filename ? (
          <MarkdownPreview
            content={content}
            filename={filename}
            filePath={selectedFile || filename}
            compareFilename={
              previousVersionFile &&
              !previousVersionLoading &&
              !previousVersionError &&
              previousVersionContent
                ? previousVersionFilename || previousVersionFile
                : undefined
            }
            compareContent={
              previousVersionFile &&
              !previousVersionLoading &&
              !previousVersionError &&
              previousVersionContent
                ? previousVersionContent
                : undefined
            }
            comments={commentState.comments}
            targetComments={commentState.targetComments}
            readonly={commentState.readonly}
            onCreateComment={commentState.createComment}
            onDeleteComment={commentState.deleteComment}
            onDeleteAllComments={commentState.deleteAllComments}
            onEditComment={commentState.editComment}
          />
        ) : (
          <div className="dev-placeholder">
            <p>No content available</p>
          </div>
        )}
      </div>
    </div>
  );
};
