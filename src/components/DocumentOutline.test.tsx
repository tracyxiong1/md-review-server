import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentOutline } from './DocumentOutline';

const headings = [
  { id: 'markdown-heading-1', text: 'Overview', level: 1 as const, line: 1 },
  {
    id: 'markdown-heading-3',
    text: 'A very long implementation section',
    level: 3 as const,
    line: 3,
  },
];

const domRect = ({
  bottom,
  left,
  right,
  top,
}: {
  bottom: number;
  left: number;
  right: number;
  top: number;
}): DOMRect =>
  ({
    bottom,
    height: bottom - top,
    left,
    right,
    top,
    width: right - left,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const renderCompactOutline = () => {
  const result = render(
    <div className="markdown-container">
      <div className="markdown-reader-scroll">
        <div className="markdown-content">
          <DocumentOutline
            headings={headings}
            activeHeadingId="markdown-heading-1"
            onNavigate={vi.fn()}
          />
        </div>
      </div>
    </div>,
  );
  const preview = result.container.querySelector<HTMLElement>('.markdown-container')!;
  const reader = result.container.querySelector<HTMLElement>('.markdown-reader-scroll')!;
  const card = result.container.querySelector<HTMLElement>('.markdown-content')!;
  const outline = screen.getByRole('navigation', { name: 'Document outline' });
  const overview = screen.getByRole('link', { name: 'Overview' });
  const implementation = screen.getByRole('link', {
    name: 'A very long implementation section',
  });

  vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue(
    domRect({ left: 100, right: 340, top: 50, bottom: 650 }),
  );
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(
    domRect({ left: 100, right: 340, top: 50, bottom: 900 }),
  );
  vi.spyOn(outline, 'getBoundingClientRect').mockReturnValue(
    domRect({ left: 100, right: 132, top: 50, bottom: 650 }),
  );
  vi.spyOn(overview, 'getBoundingClientRect').mockReturnValue(
    domRect({ left: 104, right: 128, top: 72, bottom: 92 }),
  );
  vi.spyOn(implementation, 'getBoundingClientRect').mockReturnValue(
    domRect({ left: 104, right: 128, top: 100, bottom: 120 }),
  );

  return { ...result, card, implementation, outline, overview, preview, reader };
};

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', window.location.pathname);
});

describe('DocumentOutline', () => {
  it('renders a semantic outline with hierarchy, active state, and full-text labels', () => {
    const { container } = render(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-1"
        onNavigate={vi.fn()}
      />,
    );

    const column = container.querySelector('.document-outline-column');
    const outline = screen.getByRole('navigation', { name: 'Document outline' });
    const overview = screen.getByRole('link', { name: 'Overview' });
    const implementation = screen.getByRole('link', {
      name: 'A very long implementation section',
    });

    expect(column).toContainElement(outline);
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(headings.length);
    expect(screen.getAllByRole('link')).toHaveLength(headings.length);

    expect(overview).toHaveAttribute('href', '#markdown-heading-1');
    expect(overview).toHaveAttribute('data-level', '1');
    expect(overview).toHaveStyle({ paddingInlineStart: '8px' });
    expect(overview).toHaveAttribute('aria-current', 'location');
    expect(overview).toHaveClass('active');
    expect(overview.querySelector('.document-outline-tick')).toHaveStyle({ width: '18px' });

    expect(implementation).toHaveAttribute('href', '#markdown-heading-3');
    expect(implementation).toHaveAttribute('data-level', '3');
    expect(implementation).toHaveAttribute('aria-label', 'A very long implementation section');
    expect(implementation).toHaveStyle({ paddingInlineStart: '28px' });
    expect(implementation).not.toHaveAttribute('title');
    expect(implementation.querySelector('.document-outline-label')).toHaveTextContent(
      'A very long implementation section',
    );
    expect(implementation.querySelector('.document-outline-tick')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(implementation.querySelector('.document-outline-tick')).toHaveStyle({ width: '12px' });
    expect(implementation).not.toHaveAttribute('aria-current');
    expect(implementation).not.toHaveClass('active');
    expect(implementation.tabIndex).toBe(0);
  });

  it('keeps native titles only in the full outline and updates them across the breakpoint', () => {
    let resizeObserverCallback: ResizeObserverCallback | undefined;
    let cardWidth = 600;
    const originalResizeObserver = globalThis.ResizeObserver;

    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback = callback;
      }

      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });

    try {
      const { card, implementation } = renderCompactOutline();
      Object.defineProperty(card, 'clientWidth', {
        configurable: true,
        get: () => cardWidth,
      });

      act(() => resizeObserverCallback?.([], {} as ResizeObserver));
      expect(implementation).toHaveAttribute('title', 'A very long implementation section');

      cardWidth = 240;
      act(() => resizeObserverCallback?.([], {} as ResizeObserver));
      expect(implementation).not.toHaveAttribute('title');

      cardWidth = 520;
      act(() => resizeObserverCallback?.([], {} as ResizeObserver));
      expect(implementation).toHaveAttribute('title', 'A very long implementation section');
    } finally {
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

  it('shows the heading level and full title in a constrained tooltip on hover', async () => {
    const user = userEvent.setup();
    const { implementation, container } = renderCompactOutline();

    await user.hover(implementation);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('H3');
    expect(tooltip).toHaveTextContent('A very long implementation section');
    expect(tooltip).toHaveStyle({
      position: 'fixed',
      left: '136px',
      top: '92px',
      width: '192px',
      maxHeight: '96px',
    });
    expect(container).not.toContainElement(tooltip);
    expect(implementation).toHaveAttribute('aria-describedby', tooltip.id);

    await user.unhover(implementation);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows and hides the full-title tooltip with keyboard focus', async () => {
    const user = userEvent.setup();
    renderCompactOutline();

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent('H1Overview');

    await user.tab();
    await waitFor(() =>
      expect(screen.getByRole('tooltip')).toHaveTextContent('H3A very long implementation section'),
    );

    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('falls back to the focused heading after a hovered heading is left', async () => {
    const user = userEvent.setup();
    const { implementation, overview } = renderCompactOutline();

    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('H1Overview');

    await user.hover(implementation);
    expect(screen.getByRole('tooltip')).toHaveTextContent('H3A very long implementation section');

    await user.unhover(implementation);
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('H1Overview'));
    expect(overview).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
  });

  it('repositions the fixed tooltip after scroll and resize', async () => {
    const user = userEvent.setup();
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      });
    const { implementation, reader } = renderCompactOutline();
    let implementationTop = 100;
    vi.spyOn(implementation, 'getBoundingClientRect').mockImplementation(() =>
      domRect({ left: 104, right: 128, top: implementationTop, bottom: implementationTop + 20 }),
    );
    await user.hover(implementation);
    act(() => frameCallbacks.shift()?.(0));
    expect(screen.getByRole('tooltip')).toHaveStyle({ top: '92px' });

    implementationTop = 160;
    fireEvent.scroll(reader);
    act(() => frameCallbacks.shift()?.(16));
    expect(screen.getByRole('tooltip')).toHaveStyle({ top: '152px' });

    implementationTop = 200;
    fireEvent(window, new Event('resize'));
    act(() => frameCallbacks.shift()?.(32));
    expect(screen.getByRole('tooltip')).toHaveStyle({ top: '192px' });

    requestAnimationFrameSpy.mockRestore();
  });

  it('clamps to the visible preview and hides when the visible area is too small', async () => {
    const user = userEvent.setup();
    const { implementation, preview } = renderCompactOutline();
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue(
      domRect({ left: -40, right: 180, top: -200, bottom: 90 }),
    );
    vi.spyOn(implementation, 'getBoundingClientRect').mockReturnValue(
      domRect({ left: 4, right: 28, top: 20, bottom: 40 }),
    );

    await user.hover(implementation);

    expect(await screen.findByRole('tooltip')).toHaveStyle({
      left: '36px',
      top: '12px',
      width: '132px',
      maxHeight: '66px',
    });

    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue(
      domRect({ left: 0, right: 100, top: 0, bottom: 40 }),
    );
    fireEvent(window, new Event('resize'));

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('navigates without changing the URL hash', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    window.history.replaceState(null, '', `${window.location.pathname}#existing`);

    render(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-1"
        onNavigate={onNavigate}
      />,
    );

    await user.click(screen.getByRole('link', { name: 'A very long implementation section' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('markdown-heading-3');
    expect(window.location.hash).toBe('#existing');
  });

  it('scrolls only its own viewport when the active item is below view', () => {
    const { rerender } = render(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-1"
        onNavigate={vi.fn()}
      />,
    );
    const outline = screen.getByRole('navigation', { name: 'Document outline' });
    Object.defineProperties(outline, {
      clientHeight: { configurable: true, value: 80 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    const next = screen.getByRole('link', {
      name: 'A very long implementation section',
    });
    const scrollIntoView = vi.fn();
    Object.defineProperties(next, {
      offsetTop: { configurable: true, value: 120 },
      offsetHeight: { configurable: true, value: 24 },
      scrollIntoView: { configurable: true, value: scrollIntoView },
    });

    rerender(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-3"
        onNavigate={vi.fn()}
      />,
    );

    expect(outline.scrollTop).toBe(64);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls upward to the active item and leaves in-view items unchanged', () => {
    const { rerender } = render(
      <DocumentOutline headings={headings} activeHeadingId={null} onNavigate={vi.fn()} />,
    );
    const outline = screen.getByRole('navigation', { name: 'Document outline' });
    Object.defineProperties(outline, {
      clientHeight: { configurable: true, value: 80 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });

    const overview = screen.getByRole('link', { name: 'Overview' });
    Object.defineProperties(overview, {
      offsetTop: { configurable: true, value: 40 },
      offsetHeight: { configurable: true, value: 24 },
    });

    rerender(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-1"
        onNavigate={vi.fn()}
      />,
    );
    expect(outline.scrollTop).toBe(40);

    const implementation = screen.getByRole('link', {
      name: 'A very long implementation section',
    });
    Object.defineProperties(implementation, {
      offsetTop: { configurable: true, value: 50 },
      offsetHeight: { configurable: true, value: 20 },
    });
    outline.scrollTop = 40;

    rerender(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-3"
        onNavigate={vi.fn()}
      />,
    );
    expect(outline.scrollTop).toBe(40);
  });

  it('restores active item visibility when headings change but the active ID stays the same', () => {
    const { rerender } = render(
      <DocumentOutline
        headings={headings}
        activeHeadingId="markdown-heading-1"
        onNavigate={vi.fn()}
      />,
    );
    const outline = screen.getByRole('navigation', { name: 'Document outline' });
    Object.defineProperties(outline, {
      clientHeight: { configurable: true, value: 80 },
      scrollTop: { configurable: true, writable: true, value: 120 },
    });

    const activeItem = screen.getByRole('link', { name: 'Overview' });
    Object.defineProperties(activeItem, {
      offsetTop: { configurable: true, value: 16 },
      offsetHeight: { configurable: true, value: 24 },
    });

    const replacementHeadings = [
      {
        id: 'markdown-heading-1',
        text: 'Replacement overview',
        level: 1 as const,
        line: 1,
      },
    ];
    rerender(
      <DocumentOutline
        headings={replacementHeadings}
        activeHeadingId="markdown-heading-1"
        onNavigate={vi.fn()}
      />,
    );

    expect(outline.scrollTop).toBe(16);
  });
});
