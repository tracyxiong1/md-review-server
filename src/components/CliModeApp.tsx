import { useEffect, useState } from 'react';
import { useMarkdown } from '../hooks/useMarkdown';
import { useFileWatch } from '../hooks/useFileWatch';
import { useComments } from '../hooks/useComments';
import { MarkdownPreview } from './MarkdownPreview';
import { ErrorDisplay } from './ErrorDisplay';

export const CliModeApp = () => {
  const { content, filename, loading, error, reload } = useMarkdown();
  const [commentsFile, setCommentsFile] = useState<string | null>(null);
  const commentState = useComments(commentsFile);

  useEffect(() => {
    setCommentsFile(filename);
  }, [filename]);

  // Watch for file changes and reload
  useFileWatch(() => {
    reload();
    commentState.reload();
  });

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!content || !filename) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>No content available</p>
      </div>
    );
  }

  return (
    <MarkdownPreview
      content={content}
      filename={filename}
      comments={commentState.comments}
      targetComments={commentState.targetComments}
      readonly={commentState.readonly}
      onCreateComment={commentState.createComment}
      onDeleteComment={commentState.deleteComment}
      onDeleteAllComments={commentState.deleteAllComments}
      onEditComment={commentState.editComment}
    />
  );
};
