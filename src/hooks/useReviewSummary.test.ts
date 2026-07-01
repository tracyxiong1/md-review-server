import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReviewSummary } from './useReviewSummary';

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('useReviewSummary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads all comments and exposes aggregated review summary', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/comments') {
        return jsonResponse([
          {
            id: 'c001',
            file: 'docs/guide.v2.md',
            startLine: 3,
            endLine: 3,
            selectedText: 'setup',
            comment: 'Clarify setup.',
            status: 'open',
            createdAt: '2026-06-30T00:00:00Z',
          },
          {
            id: 'c002',
            file: 'docs/guide.v1.md',
            startLine: 8,
            endLine: 8,
            selectedText: 'install',
            comment: 'Handled.',
            status: 'resolved',
            targetFile: 'docs/guide.v2.md',
            targetStartLine: 9,
            createdAt: '2026-06-30T00:00:00Z',
          },
        ]);
      }

      return Promise.resolve(new Response('Not found', { status: 404 }));
    });

    const { result } = renderHook(() =>
      useReviewSummary([
        { name: 'guide.v1.md', path: 'docs/guide.v1.md', dir: 'docs' },
        { name: 'guide.v2.md', path: 'docs/guide.v2.md', dir: 'docs' },
      ]),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.summary.byFile['docs/guide.v2.md']).toMatchObject({
        openCount: 1,
        doneCount: 0,
        allCount: 1,
      });
      expect(result.current.summary.byDirectory.docs).toMatchObject({
        fileCount: 2,
        openCount: 1,
        doneCount: 1,
        allCount: 2,
      });
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/comments', undefined);
  });
});
