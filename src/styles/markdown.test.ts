import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

// Capture first so Vite does not rewrite the CSS URL as a browser asset under jsdom.
const moduleUrl = import.meta.url;
const css = readFileSync(new URL('./markdown.css', moduleUrl), 'utf8');
const stylesheet = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('Markdown styles', () => {
  it('hides the document outline scrollbar without disabling scrolling', () => {
    expect(stylesheet).toMatch(
      /^[ \t]*\.document-outline\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-width:\s*none;/ms,
    );
    expect(stylesheet).toMatch(
      /^[ \t]*\.document-outline::-webkit-scrollbar\s*\{[^}]*display:\s*none;/ms,
    );
  });

  it('uses a compact low-contrast scrollbar for the document page', () => {
    expect(stylesheet).toMatch(
      /@supports not selector\(::-webkit-scrollbar\)\s*\{\s*\.markdown-reader-scroll\s*\{[^}]*scrollbar-color:\s*var\(--border-primary\) transparent;[^}]*scrollbar-width:\s*thin;/ms,
    );
    expect(stylesheet).toMatch(
      /^[ \t]*\.markdown-reader-scroll::-webkit-scrollbar\s*\{[^}]*width:\s*6px;[^}]*height:\s*6px;/ms,
    );
    expect(stylesheet).toMatch(
      /^[ \t]*\.markdown-reader-scroll::-webkit-scrollbar-track\s*\{[^}]*background:\s*transparent;/ms,
    );
    expect(stylesheet).toMatch(
      /^[ \t]*\.markdown-reader-scroll::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--border-primary\);[^}]*border-radius:\s*999px;/ms,
    );
    expect(stylesheet).toMatch(
      /^[ \t]*\.markdown-reader-scroll::-webkit-scrollbar-thumb:hover\s*\{[^}]*background:\s*var\(--text-tertiary\);/ms,
    );
  });

  it('reserves a compact action rail around the inline preview', () => {
    expect(stylesheet).toMatch(
      /^[ \t]*\.mermaid-pre\s*\{[^}]*--markdown-pre-padding:\s*36px 16px 4px;/ms,
    );
  });

  it('uses compact vertical padding inside the diagram container', () => {
    expect(stylesheet).toMatch(/^[ \t]*\.mermaid-container\s*\{[^}]*padding:\s*8px 16px;/ms);
  });

  it('aligns the expand button to the compact action rail', () => {
    expect(stylesheet).toMatch(/^[ \t]*\.mermaid-expand-button\s*\{[^}]*top:\s*4px;/ms);
  });

  it('shows the expand focus ring unless pointer focus suppression is requested', () => {
    expect(stylesheet).toMatch(
      /^[ \t]*\.mermaid-expand-button:focus-visible:not\(\[data-suppress-focus-ring='true'\]\)\s*\{[^}]*outline:\s*2px solid var\(--link-color\);/ms,
    );
    expect(stylesheet).toMatch(
      /^[ \t]*\.mermaid-expand-button\[data-suppress-focus-ring='true'\]:focus-visible\s*\{[^}]*outline:\s*none;/ms,
    );
  });

  it('suppresses only explicitly requested viewer toolbar focus rings', () => {
    expect(stylesheet).toMatch(
      /^[ \t]*\.mermaid-viewer-toolbar button\[data-suppress-focus-ring='true'\]:focus-visible\s*\{[^}]*outline:\s*none;/ms,
    );
    expect(stylesheet).not.toMatch(
      /^[ \t]*\.mermaid-viewer-toolbar button:focus-visible\s*\{[^}]*outline:\s*none;/ms,
    );
  });
});
