import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileTree } from './FileTree';

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

describe('FileTree', () => {
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
});
