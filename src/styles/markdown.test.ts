import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

// Capture first so Vite does not rewrite the CSS URL as a browser asset under jsdom.
const moduleUrl = import.meta.url;
const css = readFileSync(new URL('./markdown.css', moduleUrl), 'utf8');
const stylesheet = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('Mermaid markdown styles', () => {
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
