import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileList } from './useFileList';

const filesResponse = {
  files: [
    { name: 'sample.md', path: 'sample.md', dir: '.' },
    { name: 'sample.v2.md', path: 'sample.v2.md', dir: '.' },
  ],
  selectedFile: 'sample.md',
};

describe('useFileList', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('selects the file from the URL query when it exists', async () => {
    window.history.replaceState(null, '', '/?file=sample.v2.md');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(filesResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useFileList());

    await waitFor(() => {
      expect(result.current.selectedFile).toBe('sample.v2.md');
    });
  });

  it('updates the URL query when a file is selected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(filesResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useFileList());

    await waitFor(() => {
      expect(result.current.selectedFile).toBe('sample.md');
    });

    act(() => {
      result.current.setSelectedFile('sample.v2.md');
    });

    expect(window.location.search).toBe('?file=sample.v2.md');
  });

  it('selects a preferred newly added file on reload', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [{ name: 'sample.v1.md', path: 'sample.v1.md', dir: '.' }],
            selectedFile: 'sample.v1.md',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              { name: 'sample.v1.md', path: 'sample.v1.md', dir: '.' },
              { name: 'sample.v2.md', path: 'sample.v2.md', dir: '.' },
            ],
            selectedFile: 'sample.v1.md',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const { result } = renderHook(() => useFileList());

    await waitFor(() => {
      expect(result.current.selectedFile).toBe('sample.v1.md');
    });

    act(() => {
      result.current.reload('sample.v2.md');
    });

    await waitFor(() => {
      expect(result.current.selectedFile).toBe('sample.v2.md');
    });
    expect(window.location.search).toBe('?file=sample.v2.md');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
