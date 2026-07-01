import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileTree } from './FileTree';
import { buildReviewSummary } from '../lib/reviewSummary';
import type { ReviewComment } from '../types/review';

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

describe('FileTree', () => {
  const files = [
    { name: 'guide.md', path: 'docs/guide.md', dir: 'docs' },
    { name: 'guide.v1.md', path: 'docs/guide.v1.md', dir: 'docs' },
    { name: 'guide.v2.md', path: 'docs/guide.v2.md', dir: 'docs' },
  ];

  const comments: ReviewComment[] = [
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
      createdAt: '2026-06-30T00:00:00Z',
    },
  ];

  it('links to the md-review-server GitHub repository', () => {
    render(
      <FileTree
        files={[{ name: 'guide.md', path: 'guide.md', dir: '.' }]}
        selectedFile="guide.md"
        onFileSelect={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('View on GitHub')).toHaveAttribute(
      'href',
      'https://github.com/tracyxiong1/md-review-server',
    );
  });

  it('shows directory file counts and current file open counts from review summary', () => {
    render(
      <FileTree
        files={files}
        selectedFile="docs/guide.v2.md"
        onFileSelect={vi.fn()}
        reviewSummary={buildReviewSummary(files, comments)}
      />,
    );

    expect(screen.getByLabelText('Toggle docs, 3 markdown files')).toBeInTheDocument();
    expect(screen.getByLabelText('Select docs/guide.v2.md, 1 open comment')).toBeInTheDocument();
  });

  it('keeps historical versions out of the file list until searching', async () => {
    const user = userEvent.setup();

    render(
      <FileTree
        files={files}
        selectedFile="docs/guide.v2.md"
        onFileSelect={vi.fn()}
        reviewSummary={buildReviewSummary(files, comments)}
      />,
    );

    expect(screen.getByLabelText('Select docs/guide.v2.md, 1 open comment')).toBeInTheDocument();
    expect(screen.queryByLabelText('Select docs/guide.v1.md')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Select docs/guide.md')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Jump to file'), 'guide.v1');

    expect(screen.getByLabelText('Select docs/guide.v1.md')).toBeInTheDocument();
  });

  it('renders version review state and switches files from version rows', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();

    render(
      <FileTree
        files={files}
        selectedFile="docs/guide.v2.md"
        onFileSelect={onFileSelect}
        reviewSummary={buildReviewSummary(files, comments)}
      />,
    );

    expect(screen.getByRole('button', { name: 'v2 current 1 open comment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'v1 reviewed 1 done comment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'draft archived' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'v1 reviewed 1 done comment' }));

    expect(onFileSelect).toHaveBeenCalledWith('docs/guide.v1.md');
  });
});
