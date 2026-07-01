import { describe, expect, it } from 'vitest';
import { buildReviewSummary, buildVersionSummaries, parseMarkdownVersion } from './reviewSummary';
import type { ReviewComment } from '../types/review';

const files = [
  { name: 'guide.md', path: 'docs/guide.md', dir: 'docs' },
  { name: 'guide.v2.md', path: 'docs/guide.v2.md', dir: 'docs' },
  { name: 'guide.v10.md', path: 'docs/guide.v10.md', dir: 'docs' },
  { name: 'api.md', path: 'docs/api.md', dir: 'docs' },
  { name: 'intro.mdx', path: 'intro.mdx', dir: '.' },
];

const comment = (partial: Partial<ReviewComment> & Pick<ReviewComment, 'id'>): ReviewComment => ({
  file: 'docs/guide.v10.md',
  startLine: 1,
  endLine: 1,
  selectedText: 'text',
  comment: 'comment',
  status: 'open',
  createdAt: '2026-06-30T00:00:00.000Z',
  ...partial,
});

describe('reviewSummary', () => {
  it('parses markdown version names with directory, stem, extension, and numeric version', () => {
    expect(parseMarkdownVersion('docs/guide.md')).toEqual({
      dir: 'docs',
      stem: 'guide',
      ext: '.md',
      version: 0,
    });
    expect(parseMarkdownVersion('docs/guide.v2.md')).toEqual({
      dir: 'docs',
      stem: 'guide',
      ext: '.md',
      version: 2,
    });
    expect(parseMarkdownVersion('docs/guide.v10.md')).toEqual({
      dir: 'docs',
      stem: 'guide',
      ext: '.md',
      version: 10,
    });
    expect(parseMarkdownVersion('docs/notes.txt')).toBeNull();
  });

  it('aggregates open, done, and all counts by source file', () => {
    const summary = buildReviewSummary(files, [
      comment({ id: 'c001', file: 'docs/guide.v10.md', status: 'open' }),
      comment({ id: 'c002', file: 'docs/guide.v10.md', status: 'resolved' }),
      comment({ id: 'c003', file: 'docs/guide.v10.md', status: 'partially_resolved' }),
      comment({ id: 'c004', file: 'docs/api.md', status: 'unresolved' }),
    ]);

    expect(summary.byFile['docs/guide.v10.md']).toMatchObject({
      openCount: 1,
      doneCount: 2,
      allCount: 3,
    });
    expect(summary.byFile['docs/api.md']).toMatchObject({
      openCount: 0,
      doneCount: 1,
      allCount: 1,
    });
    expect(summary.byFile['docs/guide.md']).toMatchObject({
      openCount: 0,
      doneCount: 0,
      allCount: 0,
    });
  });

  it('aggregates markdown file counts and comment counts by directory', () => {
    const summary = buildReviewSummary(files, [
      comment({ id: 'c001', file: 'docs/guide.v10.md', status: 'open' }),
      comment({ id: 'c002', file: 'docs/api.md', status: 'resolved' }),
      comment({ id: 'c003', file: 'intro.mdx', status: 'open' }),
    ]);

    expect(summary.byDirectory.docs).toMatchObject({
      fileCount: 4,
      openCount: 1,
      doneCount: 1,
      allCount: 2,
    });
    expect(summary.byDirectory['.']).toMatchObject({
      fileCount: 1,
      openCount: 1,
      doneCount: 0,
      allCount: 1,
    });
  });

  it('does not count target comments against the target file summary', () => {
    const summary = buildReviewSummary(files, [
      comment({
        id: 'c001',
        file: 'docs/guide.v2.md',
        status: 'resolved',
        targetFile: 'docs/guide.v10.md',
        targetStartLine: 8,
      }),
    ]);

    expect(summary.byFile['docs/guide.v2.md']).toMatchObject({
      openCount: 0,
      doneCount: 1,
      allCount: 1,
    });
    expect(summary.byFile['docs/guide.v10.md']).toMatchObject({
      openCount: 0,
      doneCount: 0,
      allCount: 0,
    });
  });

  it('builds version summaries for the selected markdown series', () => {
    const summary = buildReviewSummary(files, [
      comment({ id: 'c001', file: 'docs/guide.v10.md', status: 'open' }),
      comment({ id: 'c002', file: 'docs/guide.v2.md', status: 'resolved' }),
      comment({ id: 'c003', file: 'docs/guide.v2.md', status: 'unresolved' }),
    ]);

    expect(buildVersionSummaries(files, 'docs/guide.v10.md', summary)).toEqual([
      expect.objectContaining({
        path: 'docs/guide.v10.md',
        label: 'v10',
        version: 10,
        state: 'current',
        isCurrent: true,
        openCount: 1,
      }),
      expect.objectContaining({
        path: 'docs/guide.v2.md',
        label: 'v2',
        version: 2,
        state: 'reviewed',
        isCurrent: false,
        doneCount: 2,
      }),
      expect.objectContaining({
        path: 'docs/guide.md',
        label: 'draft',
        version: 0,
        state: 'archived',
        isCurrent: false,
      }),
    ]);
  });
});
