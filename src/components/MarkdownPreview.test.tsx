import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownPreview } from './MarkdownPreview';
import { Comment } from './CommentList';

vi.mock('./MermaidBlock', () => ({
  MermaidBlock: () => <div data-testid="mermaid-block" />,
}));

const diffViewerMock = vi.hoisted(() => vi.fn());
const darkModeMock = vi.hoisted(() => ({ isDark: false }));
const diffViewerState = vi.hoisted(() => ({ nextMountId: 0 }));

const createMediaQueryList = (query: string, matches = false): MediaQueryList =>
  ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as MediaQueryList;

vi.mock('../hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDark: darkModeMock.isDark }),
}));

vi.mock('react-diff-viewer-continued', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    default: function MockReactDiffViewer(props: {
      oldValue: string;
      newValue: string;
      styles?: unknown;
      useDarkTheme?: boolean;
    }) {
      const mountId = React.useRef(++diffViewerState.nextMountId);
      diffViewerMock(props);
      return (
        <div
          data-testid="diff-viewer"
          data-mount-id={mountId.current}
          data-theme={props.useDarkTheme ? 'dark' : 'light'}
        >
          <div>old:{props.oldValue}</div>
          <div>new:{props.newValue}</div>
        </div>
      );
    },
  };
});

describe('MarkdownPreview', () => {
  const baseProps = {
    content: '# Test\n\nBody',
    filename: 'test.md',
  };

  beforeEach(() => {
    darkModeMock.isDark = false;
    diffViewerState.nextMountId = 0;
    diffViewerMock.mockClear();
    vi.mocked(window.matchMedia).mockReset();
    vi.mocked(window.matchMedia).mockImplementation((query) => createMediaQueryList(query));
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('does not depend on toggling bundled highlight theme link elements', () => {
    const querySelectorSpy = vi.spyOn(document, 'querySelector');

    render(
      <MarkdownPreview
        {...baseProps}
        content={'```json\n{"draftVersion": 42}\n```'}
        comments={[]}
      />,
    );

    expect(querySelectorSpy).not.toHaveBeenCalledWith('link[href*="github.css"]');
    expect(querySelectorSpy).not.toHaveBeenCalledWith('link[href*="github-dark.css"]');

    querySelectorSpy.mockRestore();
  });

  it('marks the outer pre element as a Mermaid diagram container', () => {
    render(
      <MarkdownPreview {...baseProps} content={'```mermaid\ngraph TD; A-->B\n```'} comments={[]} />,
    );

    expect(screen.getByTestId('mermaid-block').parentElement).toHaveClass('mermaid-pre');
  });

  it('collapses the comments sidebar by default when there are no comments', () => {
    render(<MarkdownPreview {...baseProps} comments={[]} />);

    expect(screen.getByRole('button', { name: 'Show comments' })).toBeInTheDocument();
    expect(screen.queryByText('No comments yet')).not.toBeInTheDocument();
  });

  it('shows the comments sidebar by default when comments exist', () => {
    const comments: Comment[] = [
      {
        id: 'c001',
        text: 'Please revise this paragraph',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(<MarkdownPreview {...baseProps} comments={comments} />);

    expect(screen.queryByRole('button', { name: 'Show comments' })).not.toBeInTheDocument();
    expect(screen.getByText('Please revise this paragraph')).toBeInTheDocument();
  });

  it('keeps the comments sidebar collapsed by default when only done comments exist', () => {
    const comments: Comment[] = [
      {
        id: 'c001',
        text: 'Answered question',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'resolved',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(<MarkdownPreview {...baseProps} comments={comments} />);

    expect(screen.getByRole('button', { name: 'Show comments' })).toBeInTheDocument();
    expect(screen.queryByText('Answered question')).not.toBeInTheDocument();
  });

  it('expands when comments load after an empty initial render', () => {
    const comments: Comment[] = [
      {
        id: 'c001',
        text: 'Loaded comment',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    const { rerender } = render(<MarkdownPreview {...baseProps} comments={[]} />);

    rerender(<MarkdownPreview {...baseProps} comments={comments} />);

    expect(screen.queryByRole('button', { name: 'Show comments' })).not.toBeInTheDocument();
    expect(screen.getByText('Loaded comment')).toBeInTheDocument();
  });

  it('does not expand when only done comments load after an empty initial render', () => {
    const comments: Comment[] = [
      {
        id: 'c001',
        text: 'Loaded resolved comment',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'resolved',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    const { rerender } = render(<MarkdownPreview {...baseProps} comments={[]} />);

    rerender(<MarkdownPreview {...baseProps} comments={comments} />);

    expect(screen.getByRole('button', { name: 'Show comments' })).toBeInTheDocument();
    expect(screen.queryByText('Loaded resolved comment')).not.toBeInTheDocument();
  });

  it('collapses when the current file has no remaining open comments', () => {
    const openComments: Comment[] = [
      {
        id: 'c001',
        text: 'Loaded comment',
        selectedText: 'Body',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];
    const doneComments: Comment[] = [
      {
        ...openComments[0],
        status: 'resolved',
      },
    ];

    const { rerender } = render(<MarkdownPreview {...baseProps} comments={openComments} />);

    expect(screen.queryByRole('button', { name: 'Show comments' })).not.toBeInTheDocument();

    rerender(<MarkdownPreview {...baseProps} comments={doneComments} />);

    expect(screen.getByRole('button', { name: 'Show comments' })).toBeInTheDocument();
  });

  it('renders frontmatter as document metadata', () => {
    render(
      <MarkdownPreview
        content={'---\ntitle: MDX Sample\ndate: 2026-06-26\nauthor: ryo-manba\n---\n\n# Body'}
        filename="sample.mdx"
        comments={[]}
      />,
    );

    expect(screen.getByText('title: MDX Sample')).toBeInTheDocument();
    expect(screen.getByText('date: 2026-06-26')).toBeInTheDocument();
    expect(screen.getByText('author: ryo-manba')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Body' })).toBeInTheDocument();
  });

  it('renders the outline beside the document body with matching heading IDs', () => {
    const { container } = render(
      <MarkdownPreview
        content={'# Overview\n\n## Details\n\nBody'}
        filename="guide.md"
        comments={[]}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Document outline' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview, H1' })).toHaveAttribute(
      'href',
      '#markdown-heading-1',
    );

    const overviewHeading = screen.getByRole('heading', { name: 'Overview' });
    const detailsHeading = screen.getByRole('heading', { name: 'Details' });
    const markdownContent = container.querySelector('.markdown-content');
    const markdownReader = container.querySelector('.markdown-reader');
    const documentBody = container.querySelector('.markdown-document-body');
    const outline = screen.getByRole('navigation', { name: 'Document outline' });

    expect(overviewHeading).toHaveAttribute('id', 'markdown-heading-1');
    expect(detailsHeading).toHaveAttribute('id', 'markdown-heading-3');
    expect(markdownContent).toHaveClass('with-document-outline');
    expect(markdownReader).toHaveClass('with-document-outline');
    expect(documentBody).toBeInTheDocument();
    expect(markdownContent).toContainElement(outline);
    expect(markdownContent).toContainElement(documentBody as HTMLElement);
    expect(documentBody).not.toContainElement(outline);
    expect(documentBody).toContainElement(overviewHeading);
    expect(documentBody).toContainElement(detailsHeading);
  });

  it('scrolls to a selected outline heading without changing the hash', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    window.history.replaceState(null, '', `${window.location.pathname}#existing`);

    render(
      <MarkdownPreview content={'# Overview\n\n## Details'} filename="guide.md" comments={[]} />,
    );
    Object.defineProperty(screen.getByRole('heading', { name: 'Details' }), 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    await user.click(screen.getByRole('link', { name: 'Details, H2' }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(screen.getByRole('link', { name: 'Details, H2' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(window.location.hash).toBe('#existing');
  });

  it('keeps the selected outline heading active during smooth navigation', async () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      });

    const { container } = render(
      <MarkdownPreview
        content={'# Overview\n\n## Middle\n\n## Target'}
        filename="guide.md"
        comments={[]}
      />,
    );
    const reader = container.querySelector<HTMLElement>('.markdown-reader-scroll');
    const overviewHeading = screen.getByRole('heading', { name: 'Overview' });
    const middleHeading = screen.getByRole('heading', { name: 'Middle' });
    const targetHeading = screen.getByRole('heading', { name: 'Target' });

    expect(reader).not.toBeNull();

    const readerRectSpy = vi
      .spyOn(reader!, 'getBoundingClientRect')
      .mockReturnValue({ top: 0 } as DOMRect);
    const overviewRectSpy = vi
      .spyOn(overviewHeading, 'getBoundingClientRect')
      .mockReturnValue({ top: 20 } as DOMRect);
    const middleRectSpy = vi
      .spyOn(middleHeading, 'getBoundingClientRect')
      .mockReturnValue({ top: 60 } as DOMRect);
    const targetRectSpy = vi
      .spyOn(targetHeading, 'getBoundingClientRect')
      .mockReturnValue({ top: 140 } as DOMRect);
    Object.defineProperty(targetHeading, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    try {
      fireEvent.click(screen.getByRole('link', { name: 'Target, H2' }));
      expect(screen.getByRole('link', { name: 'Target, H2' })).toHaveAttribute(
        'aria-current',
        'location',
      );

      fireEvent.scroll(reader!);
      act(() => frameCallbacks.shift()?.(16));

      expect(screen.getByRole('link', { name: 'Target, H2' })).toHaveAttribute(
        'aria-current',
        'location',
      );

      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 140));
      });

      expect(screen.getByRole('link', { name: 'Target, H2' })).toHaveAttribute(
        'aria-current',
        'location',
      );
    } finally {
      Reflect.deleteProperty(targetHeading, 'scrollIntoView');
      targetRectSpy.mockRestore();
      middleRectSpy.mockRestore();
      overviewRectSpy.mockRestore();
      readerRectSpy.mockRestore();
      requestAnimationFrameSpy.mockRestore();
    }
  });

  it('tracks the active outline heading while the document scrolls', () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      });

    const { container } = render(
      <MarkdownPreview
        content={'# Overview\n\n## Details\n\nBody'}
        filename="guide.md"
        comments={[]}
      />,
    );
    const reader = container.querySelector<HTMLElement>('.markdown-reader-scroll');
    const overviewHeading = screen.getByRole('heading', { name: 'Overview' });
    const detailsHeading = screen.getByRole('heading', { name: 'Details' });
    let detailsTop = 140;

    expect(reader).not.toBeNull();

    const readerRectSpy = vi
      .spyOn(reader!, 'getBoundingClientRect')
      .mockReturnValue({ top: 0 } as DOMRect);
    const overviewRectSpy = vi
      .spyOn(overviewHeading, 'getBoundingClientRect')
      .mockReturnValue({ top: 20 } as DOMRect);
    const detailsRectSpy = vi
      .spyOn(detailsHeading, 'getBoundingClientRect')
      .mockImplementation(() => ({ top: detailsTop }) as DOMRect);

    try {
      act(() => frameCallbacks.shift()?.(0));
      expect(screen.getByRole('link', { name: 'Overview, H1' })).toHaveAttribute(
        'aria-current',
        'location',
      );

      detailsTop = 60;
      fireEvent.scroll(reader!);
      act(() => frameCallbacks.shift()?.(16));

      expect(screen.getByRole('link', { name: 'Details, H2' })).toHaveAttribute(
        'aria-current',
        'location',
      );
    } finally {
      detailsRectSpy.mockRestore();
      overviewRectSpy.mockRestore();
      readerRectSpy.mockRestore();
      requestAnimationFrameSpy.mockRestore();
    }
  });

  it('tracks the active outline heading after internal layout reflow', async () => {
    const user = userEvent.setup();
    const frameCallbacks: FrameRequestCallback[] = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    const resizeObserverCallbacks: ResizeObserverCallback[] = [];
    const originalResizeObserver = globalThis.ResizeObserver;
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      });

    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallbacks.push(callback);
      }

      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
    }

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });

    const { container } = render(
      <MarkdownPreview
        content={'# Overview\n\n## Details\n\nBody'}
        filename="guide.md"
        comments={[]}
        compareFilename="guide.previous.md"
        compareContent={'# Overview\n\nOld body'}
      />,
    );
    const reader = container.querySelector<HTMLElement>('.markdown-reader-scroll');
    const documentBody = container.querySelector<HTMLElement>('.markdown-document-body');
    const overviewHeading = screen.getByRole('heading', { name: 'Overview' });
    const detailsHeading = screen.getByRole('heading', { name: 'Details' });
    let detailsTop = 140;

    expect(reader).not.toBeNull();
    expect(documentBody).not.toBeNull();

    const readerRectSpy = vi
      .spyOn(reader!, 'getBoundingClientRect')
      .mockReturnValue({ top: 0 } as DOMRect);
    const overviewRectSpy = vi
      .spyOn(overviewHeading, 'getBoundingClientRect')
      .mockReturnValue({ top: 20 } as DOMRect);
    const detailsRectSpy = vi
      .spyOn(detailsHeading, 'getBoundingClientRect')
      .mockImplementation(() => ({ top: detailsTop }) as DOMRect);

    try {
      expect(observe).toHaveBeenCalledWith(reader);
      expect(observe).toHaveBeenCalledWith(documentBody);

      act(() => frameCallbacks.shift()?.(0));
      expect(screen.getByRole('link', { name: 'Overview, H1' })).toHaveAttribute(
        'aria-current',
        'location',
      );

      detailsTop = 60;
      act(() => {
        resizeObserverCallbacks.forEach((callback) => callback([], {} as ResizeObserver));
      });
      act(() => frameCallbacks.shift()?.(16));

      expect(screen.getByRole('link', { name: 'Details, H2' })).toHaveAttribute(
        'aria-current',
        'location',
      );

      await user.click(screen.getByRole('button', { name: 'Show diff' }));
      expect(disconnect).toHaveBeenCalledTimes(resizeObserverCallbacks.length);
    } finally {
      detailsRectSpy.mockRestore();
      overviewRectSpy.mockRestore();
      readerRectSpy.mockRestore();
      requestAnimationFrameSpy.mockRestore();

      if (originalResizeObserver) {
        Object.defineProperty(globalThis, 'ResizeObserver', {
          configurable: true,
          writable: true,
          value: originalResizeObserver,
        });
      } else {
        Reflect.deleteProperty(globalThis, 'ResizeObserver');
      }
    }
  });

  it('uses immediate scrolling when reduced motion is requested', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    vi.mocked(window.matchMedia).mockImplementation((query) =>
      createMediaQueryList(query, query === '(prefers-reduced-motion: reduce)'),
    );

    render(<MarkdownPreview content="# Overview" filename="guide.md" comments={[]} />);
    Object.defineProperty(screen.getByRole('heading', { name: 'Overview' }), 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    await user.click(screen.getByRole('link', { name: 'Overview, H1' }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });

  it('does not render an empty outline for heading-free content', () => {
    const { container } = render(
      <MarkdownPreview content="Plain body" filename="plain.md" comments={[]} />,
    );

    expect(screen.queryByRole('navigation', { name: 'Document outline' })).not.toBeInTheDocument();
    expect(container.querySelector('.markdown-content')).not.toHaveClass('with-document-outline');
  });

  it('hides the outline in diff mode and restores it in preview mode', async () => {
    const user = userEvent.setup();

    render(
      <MarkdownPreview
        content={'# Guide\n\nNew text'}
        filename="guide.v2.md"
        comments={[]}
        compareFilename="guide.v1.md"
        compareContent={'# Guide\n\nOld text'}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Document outline' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show diff' }));
    expect(screen.queryByRole('navigation', { name: 'Document outline' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show preview' }));
    expect(screen.getByRole('navigation', { name: 'Document outline' })).toBeInTheDocument();
  });

  it('resets the active outline heading when the current document is replaced', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MarkdownPreview
        content={'# Overview\n\n## Details'}
        filename="guide.v1.md"
        filePath="docs/guide.v1.md"
        comments={[]}
      />,
    );
    Object.defineProperty(screen.getByRole('heading', { name: 'Details' }), 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    await user.click(screen.getByRole('link', { name: 'Details, H2' }));
    expect(screen.getByRole('link', { name: 'Details, H2' })).toHaveAttribute(
      'aria-current',
      'location',
    );

    rerender(
      <MarkdownPreview
        content={'# Replacement\n\n## New details'}
        filename="guide.v2.md"
        filePath="docs/guide.v2.md"
        comments={[]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Replacement, H1' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(screen.getByRole('link', { name: 'New details, H2' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('does not restore a stale outline selection when returning to unchanged content', async () => {
    const user = userEvent.setup();
    const documentA = {
      content: '# A overview\n\n## A details',
      filename: 'a.md',
      filePath: 'docs/a.md',
    };
    const { rerender } = render(<MarkdownPreview {...documentA} comments={[]} />);
    Object.defineProperty(screen.getByRole('heading', { name: 'A details' }), 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    await user.click(screen.getByRole('link', { name: 'A details, H2' }));
    expect(screen.getByRole('link', { name: 'A details, H2' })).toHaveAttribute(
      'aria-current',
      'location',
    );

    rerender(
      <MarkdownPreview
        content={'# B overview\n\n## B details'}
        filename="b.md"
        filePath="docs/b.md"
        comments={[]}
      />,
    );
    expect(screen.getByRole('link', { name: 'B overview, H1' })).toHaveAttribute(
      'aria-current',
      'location',
    );

    rerender(<MarkdownPreview {...documentA} comments={[]} />);
    expect(screen.getByRole('link', { name: 'A overview, H1' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(screen.getByRole('link', { name: 'A details, H2' })).not.toHaveAttribute('aria-current');
  });

  it('shows processed comment markers on target lines', async () => {
    const user = userEvent.setup();
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Please clarify the setup steps',
        selectedText: 'setup',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        targetEndLine: 3,
        targetSelectedText: 'clear setup steps',
        resolution: 'Added the missing setup details.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    const marker = await screen.findByRole('button', { name: 'Processed comments on line 3' });
    expect(marker).toBeInTheDocument();

    await user.click(marker);

    expect(screen.getByText('Please clarify the setup steps')).toBeInTheDocument();
    expect(screen.getByText('Added the missing setup details.')).toBeInTheDocument();
    expect(screen.getByText('guide.v3.md:2')).toBeInTheDocument();
  });

  it('shows processed comment markers when target lines include frontmatter', async () => {
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Please clarify the setup steps',
        selectedText: 'setup',
        startLine: 3,
        endLine: 3,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 7,
        targetEndLine: 7,
        targetSelectedText: 'Clear setup steps',
        resolution: 'Added the missing setup details.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    const { container } = render(
      <MarkdownPreview
        content={'---\ntitle: Guide\n---\n\n# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    expect(await screen.findByTestId('review-marker-c001')).toBeInTheDocument();
    expect(container.querySelector('.markdown-line-with-processed-comment')).toHaveTextContent(
      'Clear setup steps',
    );
  });

  it('preserves processed comment target lines after MDX imports are removed', async () => {
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.mdx',
        text: 'Please clarify the setup steps',
        selectedText: 'setup',
        startLine: 3,
        endLine: 3,
        status: 'resolved',
        targetFile: 'guide.v4.mdx',
        targetStartLine: 9,
        targetEndLine: 9,
        targetSelectedText: 'Clear setup steps',
        resolution: 'Added the missing setup details.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    const { container } = render(
      <MarkdownPreview
        content={
          '---\ntitle: Guide\n---\n\nimport Callout from "./Callout"\n\n# Guide\n\nClear setup steps'
        }
        filename="guide.v4.mdx"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    expect(await screen.findByTestId('review-marker-c001')).toBeInTheDocument();
    expect(container.querySelector('.markdown-line-with-processed-comment')).toHaveTextContent(
      'Clear setup steps',
    );
  });

  it('preserves full processed comment source text for long filenames', async () => {
    const user = userEvent.setup();
    const longFilename =
      'seedance25_generator_onboarding_with_a_very_long_versioned_review_filename.v123.md';
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: longFilename,
        text: 'Check the onboarding handoff.',
        selectedText: 'handoff',
        startLine: 12,
        endLine: 12,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Processed comments on line 3' }));

    expect(screen.getByText(`${longFilename}:12`)).toHaveAttribute('title', `${longFilename}:12`);
  });

  it('does not double count the same comment when it is both source and target anchored', async () => {
    const comment: Comment = {
      id: 'c001',
      file: 'guide.v4.md',
      text: 'Clarify the permission boundary',
      selectedText: 'Permission boundary',
      startLine: 3,
      endLine: 3,
      status: 'resolved',
      targetFile: 'guide.v4.md',
      targetStartLine: 3,
      targetEndLine: 3,
      resolution: 'Done.',
      createdAt: new Date('2026-06-30T00:00:00Z'),
    };

    render(
      <MarkdownPreview
        content={'# Guide\n\nPermission boundary'}
        filename="guide.v4.md"
        comments={[comment]}
        targetComments={[comment]}
      />,
    );

    const marker = await screen.findByTestId('review-marker-c001');
    expect(within(marker).queryByText('2')).not.toBeInTheDocument();
  });

  it('stacks current open comments with processed comments on the same line', async () => {
    const comments: Comment[] = [
      {
        id: 'c002',
        file: 'guide.v4.md',
        text: 'Second round comment',
        selectedText: 'Permission boundary',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-07-01T00:00:00Z'),
      },
    ];
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'First round comment',
        selectedText: 'Permission',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nPermission boundary'}
        filename="guide.v4.md"
        comments={comments}
        targetComments={targetComments}
      />,
    );

    const marker = await screen.findByRole('button', { name: 'Review comments on line 3' });
    expect(marker).toHaveTextContent('2');
  });

  it('renders markers in the document gutter layer instead of list item content', async () => {
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'First round comment',
        selectedText: 'exactly once',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    const { container } = render(
      <MarkdownPreview
        content={'# Guide\n\n- exactly once delivery'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    const marker = await screen.findByTestId('review-marker-c001');
    const markerLayer = marker.closest('.processed-comment-marker-layer');
    const documentBody = container.querySelector('.markdown-document-body');

    expect(marker.closest('li')).toBeNull();
    expect(markerLayer).toBeInTheDocument();
    expect(documentBody).toContainElement(markerLayer as HTMLElement);
  });

  it('positions markers relative to the marker layer containing block', async () => {
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Keep this marker aligned',
        selectedText: 'Body',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];
    const { container } = render(
      <MarkdownPreview
        content={'# Guide\n\nBody'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );
    const card = container.querySelector<HTMLElement>('.markdown-content');
    const body = container.querySelector<HTMLElement>('.markdown-document-body');
    const markerLayer = container.querySelector<HTMLElement>('.processed-comment-marker-layer');
    const line = container.querySelector<HTMLElement>('[data-line-start="3"]');

    expect(card).not.toBeNull();
    expect(body).not.toBeNull();
    expect(markerLayer).not.toBeNull();
    expect(line).not.toBeNull();

    vi.spyOn(card!, 'getBoundingClientRect').mockReturnValue({ top: 20 } as DOMRect);
    vi.spyOn(body!, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    vi.spyOn(line!, 'getBoundingClientRect').mockReturnValue({ top: 220, height: 20 } as DOMRect);
    Object.defineProperty(markerLayer, 'offsetParent', {
      configurable: true,
      value: card,
    });

    fireEvent(window, new Event('resize'));

    const marker = await screen.findByTestId('review-marker-c001');
    await waitFor(() =>
      expect(marker.closest('.processed-comment-marker')).toHaveStyle({ top: '210px' }),
    );
  });

  it('shows open comment markers on source lines', async () => {
    const user = userEvent.setup();
    const comments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v4.md',
        text: 'Clarify the permission boundary',
        selectedText: 'Permission boundary',
        startLine: 3,
        endLine: 3,
        status: 'open',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nPermission boundary'}
        filename="guide.v4.md"
        comments={comments}
      />,
    );

    const marker = await screen.findByRole('button', { name: 'Review comments on line 3' });
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute('data-status-icon', 'comment');

    await user.click(marker);

    expect(screen.getAllByText('Clarify the permission boundary').length).toBeGreaterThan(1);
    expect(screen.getByText('guide.v4.md:3')).toBeInTheDocument();
  });

  it('uses status-specific marker icons for processed comments', async () => {
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Resolved comment',
        selectedText: 'setup',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
      {
        id: 'c002',
        file: 'guide.v3.md',
        text: 'Partial comment',
        selectedText: 'limits',
        startLine: 4,
        endLine: 4,
        status: 'partially_resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 5,
        resolution: 'Partially done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
      {
        id: 'c003',
        file: 'guide.v3.md',
        text: 'Unresolved comment',
        selectedText: 'risk',
        startLine: 6,
        endLine: 6,
        status: 'unresolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 7,
        resolution: 'Not done.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nResolved\n\nPartial\n\nUnresolved'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    expect(await screen.findByTestId('review-marker-c001')).toHaveAttribute(
      'data-status-icon',
      'check',
    );
    expect(await screen.findByTestId('review-marker-c002')).toHaveAttribute(
      'data-status-icon',
      'alert',
    );
    expect(await screen.findByTestId('review-marker-c003')).toHaveAttribute(
      'data-status-icon',
      'alert',
    );
  });

  it('closes marker tips when pressing Escape', async () => {
    const user = userEvent.setup();
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Please clarify the setup steps',
        selectedText: 'setup',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Added the missing setup details.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Processed comments on line 3' }));
    expect(screen.getByText('Added the missing setup details.')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByText('Added the missing setup details.')).not.toBeInTheDocument();
  });

  it('closes processed comment marker tips when clicking outside', async () => {
    const user = userEvent.setup();
    const targetComments: Comment[] = [
      {
        id: 'c001',
        file: 'guide.v3.md',
        text: 'Please clarify the setup steps',
        selectedText: 'setup',
        startLine: 2,
        endLine: 2,
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 3,
        resolution: 'Added the missing setup details.',
        createdAt: new Date('2026-06-30T00:00:00Z'),
      },
    ];

    render(
      <MarkdownPreview
        content={'# Guide\n\nClear setup steps'}
        filename="guide.v4.md"
        comments={[]}
        targetComments={targetComments}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Processed comments on line 3' }));
    expect(screen.getByText('Added the missing setup details.')).toBeInTheDocument();

    await user.click(screen.getByRole('heading', { name: 'Guide' }));

    expect(screen.queryByText('Added the missing setup details.')).not.toBeInTheDocument();
  });

  it('toggles between markdown preview and diff view when compare content exists', async () => {
    const user = userEvent.setup();

    render(
      <MarkdownPreview
        content={'# Guide\n\nNew text'}
        filename="guide.v2.md"
        comments={[]}
        compareFilename="guide.v1.md"
        compareContent={'# Guide\n\nOld text'}
      />,
    );

    expect(screen.getByRole('button', { name: 'Show preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Show diff' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByTestId('diff-viewer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show diff' }));

    const diffViewer = screen.getByTestId('diff-viewer');
    expect(diffViewer).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show preview' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Show diff' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(diffViewer).toHaveTextContent('old:# Guide Old text');
    expect(diffViewer).toHaveTextContent('new:# Guide New text');
    expect(diffViewerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hideSummary: true,
        showDiffOnly: false,
        splitView: false,
      }),
    );

    expect(screen.getByRole('button', { name: 'Use single-column diff view' })).toHaveTextContent(
      'Single',
    );

    await user.click(screen.getByRole('button', { name: 'Use two-column diff view' }));

    expect(diffViewerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hideSummary: true,
        showDiffOnly: false,
        splitView: true,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Show preview' }));

    expect(screen.queryByTestId('diff-viewer')).not.toBeInTheDocument();
  });

  it('remounts the diff viewer when the active theme changes', async () => {
    const user = userEvent.setup();
    const previewProps = {
      content: '# Guide\n\nNew text',
      filename: 'guide.v2.md',
      comments: [],
      compareFilename: 'guide.v1.md',
      compareContent: '# Guide\n\nOld text',
    };

    const { rerender } = render(<MarkdownPreview {...previewProps} />);

    await user.click(screen.getByRole('button', { name: 'Show diff' }));

    expect(screen.getByTestId('diff-viewer')).toHaveAttribute('data-theme', 'light');
    expect(screen.getByTestId('diff-viewer')).toHaveAttribute('data-mount-id', '1');

    darkModeMock.isDark = true;
    rerender(<MarkdownPreview {...previewProps} />);

    expect(screen.getByTestId('diff-viewer')).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByTestId('diff-viewer')).toHaveAttribute('data-mount-id', '2');
  });

  it('passes app theme variables into the diff viewer dark theme', async () => {
    const user = userEvent.setup();
    darkModeMock.isDark = true;

    render(
      <MarkdownPreview
        content="# Guide\n\nNew text"
        filename="guide.v2.md"
        comments={[]}
        compareFilename="guide.v1.md"
        compareContent="# Guide\n\nOld text"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Show diff' }));

    expect(diffViewerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        useDarkTheme: true,
        styles: expect.objectContaining({
          variables: expect.objectContaining({
            dark: expect.objectContaining({
              diffViewerBackground: 'var(--bg-panel)',
              addedBackground: 'var(--diff-added-bg)',
              removedBackground: 'var(--diff-removed-bg)',
              diffViewerTitleBackground: 'var(--bg-elevated)',
            }),
          }),
        }),
      }),
    );
  });
});
