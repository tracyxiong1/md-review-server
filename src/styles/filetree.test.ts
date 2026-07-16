import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const moduleUrl = import.meta.url;
const css = readFileSync(new URL('./filetree.css', moduleUrl), 'utf8');
const stylesheet = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('File tree styles', () => {
  it('keeps the sidebar shell fixed around independently sized content', () => {
    expect(stylesheet).toMatch(/^[ \t]*\.file-tree\s*\{[^}]*overflow:\s*hidden;/ms);
    expect(stylesheet).toMatch(
      /^[ \t]*\.file-tree-content\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*120px;[^}]*overflow:\s*auto;/ms,
    );
    expect(stylesheet).toMatch(
      /^[ \t]*\.file-tree-versions\s*\{[^}]*max-height:\s*45%;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/ms,
    );
  });

  it('scrolls version rows inside their own bounded list', () => {
    expect(stylesheet).toMatch(
      /^[ \t]*\.file-tree-version-list\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/ms,
    );
  });

  it('uses the compact cross-browser scrollbar treatment for both lists', () => {
    expect(stylesheet).toMatch(
      /^[ \t]*:is\(\.file-tree-content, \.file-tree-version-list\)::-webkit-scrollbar\s*\{[^}]*width:\s*6px;[^}]*height:\s*6px;/ms,
    );
    expect(stylesheet).toMatch(
      /@supports not selector\(::-webkit-scrollbar\)\s*\{\s*:is\(\.file-tree-content, \.file-tree-version-list\)\s*\{[^}]*scrollbar-color:\s*var\(--border-primary\) transparent;[^}]*scrollbar-width:\s*thin;/ms,
    );
  });
});
