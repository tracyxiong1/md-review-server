import type { ReviewComment } from '../types/review';

export interface FileInfo {
  name: string;
  path: string;
  dir: string;
}

export interface FileReviewSummary {
  file: string;
  openCount: number;
  doneCount: number;
  allCount: number;
}

export interface DirectoryReviewSummary {
  dir: string;
  fileCount: number;
  openCount: number;
  doneCount: number;
  allCount: number;
}

export type VersionReviewState = 'current' | 'reviewed' | 'draft' | 'archived';

export interface VersionReviewSummary extends FileReviewSummary {
  path: string;
  label: string;
  version: number;
  state: VersionReviewState;
  isCurrent: boolean;
}

export interface ReviewSummary {
  byFile: Record<string, FileReviewSummary>;
  byDirectory: Record<string, DirectoryReviewSummary>;
}

export interface MarkdownVersionInfo {
  dir: string;
  stem: string;
  ext: string;
  version: number;
}

const VERSIONED_MARKDOWN_RE = /^(?<stem>.+?)(?:\.v(?<version>\d+))?(?<ext>\.md|\.markdown|\.mdx)$/;
const EMPTY_REVIEW_SUMMARY: Omit<FileReviewSummary, 'file'> = {
  openCount: 0,
  doneCount: 0,
  allCount: 0,
};

function createFileSummary(file: string): FileReviewSummary {
  return { file, ...EMPTY_REVIEW_SUMMARY };
}

function createDirectorySummary(dir: string): DirectoryReviewSummary {
  return { dir, fileCount: 0, ...EMPTY_REVIEW_SUMMARY };
}

function getDirectory(path: string) {
  const parts = path.split('/');
  if (parts.length <= 1) return '.';
  return parts.slice(0, -1).join('/');
}

function getDirectoryAncestors(dir: string) {
  if (!dir || dir === '.') return ['.'];

  const parts = dir.split('/');
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
}

function isDoneStatus(status: ReviewComment['status']) {
  return status !== 'open';
}

function incrementSummary(summary: FileReviewSummary | DirectoryReviewSummary, status: ReviewComment['status']) {
  if (isDoneStatus(status)) {
    summary.doneCount += 1;
  } else {
    summary.openCount += 1;
  }
  summary.allCount += 1;
}

export function parseMarkdownVersion(filePath: string): MarkdownVersionInfo | null {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  const match = fileName.match(VERSIONED_MARKDOWN_RE);
  if (!match?.groups) {
    return null;
  }

  return {
    dir: parts.length > 1 ? parts.slice(0, -1).join('/') : '.',
    stem: match.groups.stem,
    ext: match.groups.ext,
    version: Number(match.groups.version || 0),
  };
}

export function buildReviewSummary(files: FileInfo[], comments: ReviewComment[]): ReviewSummary {
  const byFile: Record<string, FileReviewSummary> = {};
  const byDirectory: Record<string, DirectoryReviewSummary> = {};

  for (const file of files) {
    byFile[file.path] = createFileSummary(file.path);

    const dir = file.dir && file.dir !== '' ? file.dir : getDirectory(file.path);
    for (const ancestor of getDirectoryAncestors(dir)) {
      byDirectory[ancestor] = byDirectory[ancestor] || createDirectorySummary(ancestor);
      byDirectory[ancestor].fileCount += 1;
    }
  }

  for (const comment of comments) {
    const file = comment.file;
    if (!file) continue;

    byFile[file] = byFile[file] || createFileSummary(file);
    incrementSummary(byFile[file], comment.status);

    const dir = getDirectory(file);
    for (const ancestor of getDirectoryAncestors(dir)) {
      byDirectory[ancestor] = byDirectory[ancestor] || createDirectorySummary(ancestor);
      incrementSummary(byDirectory[ancestor], comment.status);
    }
  }

  return { byFile, byDirectory };
}

function getVersionState(isCurrent: boolean, fileSummary: FileReviewSummary): VersionReviewState {
  if (isCurrent) {
    return 'current';
  }

  if (fileSummary.doneCount > 0 && fileSummary.openCount === 0) {
    return 'reviewed';
  }

  if (fileSummary.openCount > 0) {
    return 'reviewed';
  }

  return 'archived';
}

export function buildVersionSummaries(
  files: FileInfo[],
  selectedFile: string | null,
  summary: ReviewSummary,
): VersionReviewSummary[] {
  if (!selectedFile) {
    return [];
  }

  const selectedVersion = parseMarkdownVersion(selectedFile);
  if (!selectedVersion) {
    return [];
  }

  return files
    .map((file) => {
      const candidate = parseMarkdownVersion(file.path);
      if (!candidate) return null;

      const isSameSeries =
        candidate.dir === selectedVersion.dir &&
        candidate.stem === selectedVersion.stem &&
        candidate.ext === selectedVersion.ext;
      if (!isSameSeries) return null;

      const fileSummary = summary.byFile[file.path] || createFileSummary(file.path);
      const isCurrent = file.path === selectedFile;

      return {
        ...fileSummary,
        path: file.path,
        label: candidate.version > 0 ? `v${candidate.version}` : 'draft',
        version: candidate.version,
        state: getVersionState(isCurrent, fileSummary),
        isCurrent,
      };
    })
    .filter((row): row is VersionReviewSummary => row !== null)
    .sort((a, b) => b.version - a.version);
}
