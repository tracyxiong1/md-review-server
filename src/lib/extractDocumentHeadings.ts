import type { Heading } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export interface DocumentHeading {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  line: number;
}

export const getDocumentHeadingId = (line: number) => `markdown-heading-${line}`;

export const extractDocumentHeadings = (markdown: string): DocumentHeading[] => {
  try {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
    const headings: DocumentHeading[] = [];

    visit(tree, 'heading', (node: Heading) => {
      const line = node.position?.start.line;
      const text = toString(node).trim();
      if (!line || !text) return;

      headings.push({
        id: getDocumentHeadingId(line),
        text,
        level: node.depth,
        line,
      });
    });

    return headings;
  } catch {
    return [];
  }
};
