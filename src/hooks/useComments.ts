import { useCallback, useEffect, useState } from 'react';
import { CreateCommentInput, ReviewComment, ReviewCommentReplyAuthor } from '../types/review';
import { syncDocumentAnalytics } from './useDocumentAnalytics';

interface ReviewSession {
  readonly: boolean;
}

interface UseCommentsData {
  comments: ReviewComment[];
  targetComments: ReviewComment[];
  loading: boolean;
  error: Error | null;
  readonly: boolean;
  reload: () => void;
  createComment: (input: CreateCommentInput) => Promise<void>;
  editComment: (id: string, file: string, comment: string) => Promise<void>;
  addCommentReply: (
    id: string,
    file: string,
    body: string,
    author?: ReviewCommentReplyAuthor,
  ) => Promise<void>;
  deleteComment: (id: string, file: string) => Promise<void>;
  deleteAllComments: (file: string) => Promise<void>;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const useComments = (filePath?: string | null): UseCommentsData => {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [targetComments, setTargetComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [readonly, setReadonly] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const reload = useCallback(() => {
    setReloadTrigger((value) => value + 1);
  }, []);

  useEffect(() => {
    const loadComments = async () => {
      if (!filePath) {
        setComments([]);
        setTargetComments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [session, nextComments, nextTargetComments] = await Promise.all([
          fetchJson<ReviewSession>('/api/session'),
          fetchJson<ReviewComment[]>(`/api/comments?file=${encodeURIComponent(filePath)}`),
          fetchJson<ReviewComment[]>(`/api/comments?targetFile=${encodeURIComponent(filePath)}`),
        ]);
        setReadonly(Boolean(session.readonly));
        setComments(nextComments);
        setTargetComments(
          nextTargetComments.filter(
            (comment) =>
              comment.status !== 'open' &&
              comment.status !== 'ignored' &&
              typeof comment.targetStartLine === 'number',
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setComments([]);
        setTargetComments([]);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [filePath, reloadTrigger]);

  const createComment = useCallback(
    async (input: CreateCommentInput) => {
      await fetchJson<ReviewComment>('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      void syncDocumentAnalytics(input.file);
      reload();
    },
    [reload],
  );

  const editComment = useCallback(
    async (id: string, file: string, comment: string) => {
      await fetchJson<ReviewComment>(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, comment }),
      });
      reload();
    },
    [reload],
  );

  const addCommentReply = useCallback(
    async (id: string, file: string, body: string, author: ReviewCommentReplyAuthor = 'user') => {
      await fetchJson<ReviewComment>(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file,
          ...(author === 'user' ? { status: 'open' } : {}),
          reply: {
            author,
            body,
          },
        }),
      });
      reload();
    },
    [reload],
  );

  const deleteComment = useCallback(
    async (id: string, file: string) => {
      const response = await fetch(`/api/comments/${id}?file=${encodeURIComponent(file)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `API request failed: ${response.status}`);
      }
      reload();
    },
    [reload],
  );

  const deleteAllComments = useCallback(
    async (file: string) => {
      await Promise.all(comments.map((comment) => deleteComment(comment.id, file)));
      reload();
    },
    [comments, deleteComment, reload],
  );

  return {
    comments,
    targetComments,
    loading,
    error,
    readonly,
    reload,
    createComment,
    editComment,
    addCommentReply,
    deleteComment,
    deleteAllComments,
  };
};
