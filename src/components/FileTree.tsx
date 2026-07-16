import { useState, useEffect, useMemo, useRef } from 'react';
import { ThemeToggle } from './ThemeToggle';
import {
  buildReviewSummary,
  buildVersionSummaries,
  parseMarkdownVersion,
  type ReviewSummary,
} from '../lib/reviewSummary';
import '../styles/filetree.css';

interface FileInfo {
  name: string;
  path: string;
  dir: string;
}

interface FileTreeProps {
  files: FileInfo[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  onToggleSidebar?: () => void;
  autoFocusSearch?: boolean;
  reviewSummary?: ReviewSummary;
}

interface TreeNode {
  name: string;
  path?: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function buildTree(files: FileInfo[]): TreeNode {
  const root: TreeNode = {
    name: 'root',
    children: new Map(),
    isFile: false,
  };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: isLastPart ? file.path : parts.slice(0, i + 1).join('/'),
          children: new Map(),
          isFile: isLastPart,
        });
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

function formatOpenCount(count: number) {
  return `${count} open ${count === 1 ? 'comment' : 'comments'}`;
}

function formatDoneCount(count: number) {
  return `${count} done ${count === 1 ? 'comment' : 'comments'}`;
}

function buildHistoricalVersionMap(files: FileInfo[]) {
  const latestBySeries = new Map<string, number>();

  for (const file of files) {
    const version = parseMarkdownVersion(file.path);
    if (!version) continue;

    const key = `${version.dir}/${version.stem}${version.ext}`;
    latestBySeries.set(key, Math.max(latestBySeries.get(key) || 0, version.version));
  }

  return latestBySeries;
}

function isHistoricalVersion(filePath: string, latestBySeries: Map<string, number>) {
  const version = parseMarkdownVersion(filePath);
  if (!version) return false;

  const key = `${version.dir}/${version.stem}${version.ext}`;
  return version.version < (latestBySeries.get(key) || 0);
}

function getVersionRowMeta(row: ReturnType<typeof buildVersionSummaries>[number]) {
  if (row.openCount > 0) {
    return String(row.openCount);
  }

  if (row.doneCount > 0) {
    return `${row.doneCount} done`;
  }

  if (row.state === 'current') {
    return 'current';
  }

  return row.state === 'reviewed' ? 'reviewed' : 'archived';
}

function getVersionRowAriaLabel(row: ReturnType<typeof buildVersionSummaries>[number]) {
  if (row.openCount > 0) {
    return `${row.label} ${row.state} ${formatOpenCount(row.openCount)}`;
  }

  if (row.doneCount > 0) {
    return `${row.label} ${row.state} ${formatDoneCount(row.doneCount)}`;
  }

  return `${row.label} ${row.state}`;
}

function TreeNodeComponent({
  node,
  selectedFile,
  onFileSelect,
  reviewSummary,
  latestBySeries,
  level = 0,
}: {
  node: TreeNode;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  reviewSummary: ReviewSummary;
  latestBySeries: Map<string, number>;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0 || level === 1);

  if (node.isFile) {
    const fileSummary = node.path ? reviewSummary.byFile[node.path] : undefined;
    const openCount = fileSummary?.openCount || 0;
    const fileMeta =
      openCount > 0
        ? String(openCount)
        : node.path && isHistoricalVersion(node.path, latestBySeries)
          ? 'old'
          : null;

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={
          node.path && openCount > 0
            ? `Select ${node.path}, ${formatOpenCount(openCount)}`
            : `Select ${node.path || node.name}`
        }
        className={`tree-item file ${selectedFile === node.path ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => node.path && onFileSelect(node.path)}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && node.path) {
            event.preventDefault();
            onFileSelect(node.path);
          }
        }}
      >
        <svg
          className="file-icon"
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 2.75h6.25L15 6.5v10.75H5V2.75Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M11.25 2.75V6.5H15"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <span className="file-name">{node.name}</span>
        {fileMeta && (
          <span className={openCount > 0 ? 'tree-count-badge' : 'tree-item-meta'}>{fileMeta}</span>
        )}
      </div>
    );
  }

  const sortedChildren = Array.from(node.children.entries()).sort((a, b) => {
    // Directories first, then files
    if (!a[1].isFile && b[1].isFile) return -1;
    if (a[1].isFile && !b[1].isFile) return 1;
    return a[0].localeCompare(b[0]);
  });

  if (node.name === 'root') {
    return (
      <>
        {sortedChildren.map(([, child]) => (
          <TreeNodeComponent
            key={child.path || child.name}
            node={child}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            reviewSummary={reviewSummary}
            latestBySeries={latestBySeries}
            level={0}
          />
        ))}
      </>
    );
  }

  const directorySummary = node.path ? reviewSummary.byDirectory[node.path] : undefined;
  const fileCount = directorySummary?.fileCount || 0;
  const directoryLabel =
    fileCount > 0
      ? `Toggle ${node.path || node.name}, ${fileCount} markdown ${fileCount === 1 ? 'file' : 'files'}`
      : `Toggle ${node.path || node.name}`;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={directoryLabel}
        className="tree-item directory"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsExpanded((value) => !value);
          }
        }}
      >
        <svg
          className="chevron-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          className="folder-icon"
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.75 5.25A1.75 1.75 0 0 1 4.5 3.5h4.25l2 2H15.5a1.75 1.75 0 0 1 1.75 1.75v8A1.75 1.75 0 0 1 15.5 17H4.5a1.75 1.75 0 0 1-1.75-1.75v-10Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <span className="folder-name">{node.name}</span>
        {fileCount > 0 && <span className="tree-item-meta">{fileCount}</span>}
      </div>
      {isExpanded && (
        <div className="tree-children">
          {sortedChildren.map(([, child]) => (
            <TreeNodeComponent
              key={child.path || child.name}
              node={child}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              reviewSummary={reviewSummary}
              latestBySeries={latestBySeries}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const FileTree = ({
  files,
  selectedFile,
  onFileSelect,
  onToggleSidebar,
  autoFocusSearch,
  reviewSummary,
}: FileTreeProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const latestBySeries = useMemo(() => buildHistoricalVersionMap(files), [files]);

  // Filter files based on search query
  const visibleFiles = searchQuery
    ? files
    : files.filter((file) => !isHistoricalVersion(file.path, latestBySeries));
  const filteredFiles = searchQuery
    ? visibleFiles.filter(
        (file) =>
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.path.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : visibleFiles;

  const tree = buildTree(filteredFiles);
  const effectiveReviewSummary = useMemo(
    () => reviewSummary || buildReviewSummary(files, []),
    [files, reviewSummary],
  );
  const versionRows = buildVersionSummaries(files, selectedFile, effectiveReviewSummary);

  // Auto focus search input when requested
  useEffect(() => {
    if (autoFocusSearch) {
      searchInputRef.current?.focus();
    }
  }, [autoFocusSearch]);

  // Keyboard shortcut: Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <div className="file-tree-brand-row">
          <div className="file-tree-brand">
            <span className="file-tree-brand-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 7h10M7 12h6M6 3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H9l-6 3V6a3 3 0 0 1 3-3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h3>md-review-server</h3>
          </div>
          {onToggleSidebar && (
            <button
              className="sidebar-collapse-button"
              onClick={onToggleSidebar}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12 4L6 10L12 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="search-container">
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M12.75 12.75L17 17"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Jump to file"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="file-tree-content">
        <div className="section-label">Files</div>
        <TreeNodeComponent
          node={tree}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          reviewSummary={effectiveReviewSummary}
          latestBySeries={latestBySeries}
        />
        {filteredFiles.length === 0 && <p className="file-tree-empty">No matching files</p>}
        {filteredFiles.length > 0 && searchQuery && (
          <p className="file-tree-count">
            {filteredFiles.length} of {files.length} files
          </p>
        )}
      </div>
      <div className="file-tree-versions">
        <div className="section-label">Versions</div>
        <div className="file-tree-version-list">
          {versionRows.length > 0 ? (
            versionRows.map((row) => (
              <button
                key={row.path}
                className={`version-row ${row.isCurrent ? 'current' : ''}`}
                type="button"
                aria-label={getVersionRowAriaLabel(row)}
                onClick={() => onFileSelect(row.path)}
              >
                <span className="version-row-label">
                  <span>{row.label}</span>
                  {row.state !== 'archived' && (
                    <span className="version-row-state">{row.state}</span>
                  )}
                </span>
                <span className={row.openCount > 0 ? 'tree-count-badge' : 'version-row-meta'}>
                  {getVersionRowMeta(row)}
                </span>
              </button>
            ))
          ) : (
            <div className="version-row muted">
              <span>Current</span>
              <span>single</span>
            </div>
          )}
        </div>
      </div>
      <div className="file-tree-footer">
        <ThemeToggle />
        <a
          href="https://github.com/tracyxiong1/md-review-server"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          aria-label="View on GitHub"
          title="View on GitHub"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      </div>
    </div>
  );
};
