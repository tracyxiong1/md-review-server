import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildReviewSummary, type FileInfo, type ReviewSummary } from '../lib/reviewSummary';
import type { ReviewComment } from '../types/review';

interface UseReviewSummaryData {
  comments: ReviewComment[];
  summary: ReviewSummary;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const useReviewSummary = (files: FileInfo[]): UseReviewSummaryData => {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const filesKey = files.map((file) => file.path).join('\n');
  const hasFiles = files.length > 0;

  const reload = useCallback(() => {
    setReloadTrigger((value) => value + 1);
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      if (!hasFiles) {
        setComments([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextComments = await fetchJson<ReviewComment[]>('/api/comments');
        setComments(nextComments);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [filesKey, hasFiles, reloadTrigger]);

  const summary = useMemo(() => buildReviewSummary(files, comments), [files, comments]);

  return {
    comments,
    summary,
    loading,
    error,
    reload,
  };
};
