import { describe, expect, it } from 'vitest';
import { extractDocumentHeadings, getDocumentHeadingId } from './extractDocumentHeadings';

describe('extractDocumentHeadings', () => {
  it('extracts H1 through H6 with visible inline text', () => {
    const markdown = [
      '# Product `guide`',
      '## Current *flow*',
      '### Proposed [flow](https://example.com)',
      '#### Failure ~~state~~',
      '##### Retry path',
      '###### Local fallback',
    ].join('\n');

    expect(extractDocumentHeadings(markdown)).toEqual([
      { id: 'markdown-heading-1', text: 'Product guide', level: 1, line: 1 },
      { id: 'markdown-heading-2', text: 'Current flow', level: 2, line: 2 },
      { id: 'markdown-heading-3', text: 'Proposed flow', level: 3, line: 3 },
      { id: 'markdown-heading-4', text: 'Failure state', level: 4, line: 4 },
      { id: 'markdown-heading-5', text: 'Retry path', level: 5, line: 5 },
      { id: 'markdown-heading-6', text: 'Local fallback', level: 6, line: 6 },
    ]);
  });

  it('supports Setext headings and keeps duplicate labels independently addressable', () => {
    const markdown = ['Repeat', '======', '', '# Repeat', '', 'Details', '-------'].join('\n');

    expect(extractDocumentHeadings(markdown)).toEqual([
      { id: 'markdown-heading-1', text: 'Repeat', level: 1, line: 1 },
      { id: 'markdown-heading-4', text: 'Repeat', level: 1, line: 4 },
      { id: 'markdown-heading-6', text: 'Details', level: 2, line: 6 },
    ]);
  });

  it('ignores heading-looking text inside fenced code and returns an empty list without headings', () => {
    expect(extractDocumentHeadings('```md\n# Not a heading\n```\n\nBody')).toEqual([]);
    expect(extractDocumentHeadings('Plain paragraph')).toEqual([]);
    expect(extractDocumentHeadings('')).toEqual([]);
  });

  it('generates the same IDs used by rendered heading components', () => {
    expect(getDocumentHeadingId(12)).toBe('markdown-heading-12');
  });
});
