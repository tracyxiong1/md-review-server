import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComments } from './useComments';

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('useComments', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads current file comments and processed target comments', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);

      if (url === '/api/session') {
        return jsonResponse({ readonly: false });
      }

      if (url === '/api/comments?file=guide.v4.md') {
        return jsonResponse([
          {
            id: 'c002',
            file: 'guide.v4.md',
            startLine: 3,
            endLine: 3,
            selectedText: 'current',
            comment: 'Current file comment',
            status: 'open',
            createdAt: '2026-06-30T00:00:00Z',
          },
        ]);
      }

      if (url === '/api/comments?targetFile=guide.v4.md') {
        return jsonResponse([
          {
            id: 'c001',
            file: 'guide.v3.md',
            startLine: 2,
            endLine: 2,
            selectedText: 'old',
            comment: 'Previous version comment',
            status: 'resolved',
            targetFile: 'guide.v4.md',
            targetStartLine: 3,
            resolution: 'Handled in v4.',
            createdAt: '2026-06-30T00:00:00Z',
          },
          {
            id: 'c003',
            file: 'guide.v3.md',
            startLine: 5,
            endLine: 5,
            selectedText: 'ignored',
            comment: 'Ignored comment',
            status: 'ignored',
            targetFile: 'guide.v4.md',
            targetStartLine: 7,
            createdAt: '2026-06-30T00:00:00Z',
          },
        ]);
      }

      return Promise.resolve(new Response('Not found', { status: 404 }));
    });

    const { result } = renderHook(() => useComments('guide.v4.md'));

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
      expect(result.current.targetComments).toMatchObject([
        {
          id: 'c001',
          file: 'guide.v3.md',
          status: 'resolved',
          targetStartLine: 3,
          resolution: 'Handled in v4.',
        },
      ]);
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/comments?targetFile=guide.v4.md', undefined);
  });
});
