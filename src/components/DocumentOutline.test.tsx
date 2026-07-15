import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import markdownStyles from '../styles/markdown.css?raw';
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
  const overview = screen.getByRole('link', { name: 'Overview, H1' });
  const implementation = screen.getByRole('link', {
    name: 'A very long implementation section, H3',
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', window.location.pathname);
});

describe('DocumentOutline', () => {
  it('removes the divider only from the compact outline rail', () => {
    expect(markdownStyles).toMatch(
      /\.document-outline-column\s*{[^}]*border-right:\s*1px solid var\(--border-secondary\)/,
    );
    expect(markdownStyles).toMatch(
      /@container document-outline-card \(width < 760px\)\s*{\s*\.document-outline-column\s*{\s*width:\s*32px;\s*border-right:\s*0;/,
    );
  });

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
    const overview = screen.getByRole('link', { name: 'Overview, H1' });
    const implementation = screen.getByRole('link', {
      name: 'A very long implementation section, H3',
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
    expect(implementation).toHaveAccessibleName('A very long implementation section, H3');
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
    let cardWidth = 760;
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

      cardWidth = 759;
      act(() => resizeObserverCallback?.([], {} as ResizeObserver));
      expect(implementation).not.toHaveAttribute('title');

      cardWidth = 760;
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
      maxHeight: '546px',
    });
    expect(tooltip).toHaveStyle({ pointerEvents: 'auto' });
    expect(tooltip).not.toHaveAttribute('tabindex');
    const bridge = tooltip.querySelector('.document-outline-tooltip-bridge');
    expect(bridge).toHaveStyle({
      position: 'absolute',
      right: '100%',
      width: '8px',
      height: '100%',
    });
    expect(tooltip.querySelector('.document-outline-tooltip-scroll')).toHaveStyle({
      overflow: 'auto',
      maxHeight: '544px',
    });
    expect(container).not.toContainElement(tooltip);
    expect(implementation).toHaveAttribute('aria-describedby', tooltip.id);

    await user.unhover(implementation);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('keeps the tooltip open while the pointer moves into it and closes after leaving', async () => {
    const { implementation } = renderCompactOutline();

    fireEvent.mouseEnter(implementation);
    const tooltip = await screen.findByRole('tooltip');
    const bridge = tooltip.querySelector('.document-outline-tooltip-bridge')!;
    vi.useFakeTimers();

    fireEvent.mouseLeave(implementation);
    fireEvent.mouseEnter(bridge);
    act(() => vi.advanceTimersByTime(100));

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseEnter(tooltip);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(tooltip);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('scrolls the open tooltip from the focused outline link', async () => {
    const user = userEvent.setup();
    renderCompactOutline();

    await user.tab();
    const tooltip = await screen.findByRole('tooltip');
    const scroller = tooltip.querySelector<HTMLElement>('.document-outline-tooltip-scroll')!;
    Object.defineProperties(scroller, {
      clientHeight: { configurable: true, value: 50 },
      scrollHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    expect(fireEvent.keyDown(document, { key: 'ArrowDown' })).toBe(false);
    expect(scroller.scrollTop).toBe(40);
    expect(fireEvent.keyDown(document, { key: 'PageDown' })).toBe(false);
    expect(scroller.scrollTop).toBe(90);
    expect(fireEvent.keyDown(document, { key: 'End' })).toBe(false);
    expect(scroller.scrollTop).toBe(250);
    expect(fireEvent.keyDown(document, { key: 'PageUp' })).toBe(false);
    expect(scroller.scrollTop).toBe(200);
    expect(fireEvent.keyDown(document, { key: 'Home' })).toBe(false);
    expect(scroller.scrollTop).toBe(0);
    expect(fireEvent.keyDown(document, { key: 'ArrowUp' })).toBe(false);
    expect(scroller.scrollTop).toBe(0);
  });

  it('does not consume page scrolling keys for a pointer-opened tooltip', async () => {
    const { implementation } = renderCompactOutline();

    fireEvent.mouseEnter(implementation);
    const tooltip = await screen.findByRole('tooltip');
    const scroller = tooltip.querySelector<HTMLElement>('.document-outline-tooltip-scroll')!;
    Object.defineProperties(scroller, {
      clientHeight: { configurable: true, value: 50 },
      scrollHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    expect(fireEvent.keyDown(document, { key: 'ArrowDown' })).toBe(true);
    expect(scroller.scrollTop).toBe(0);
  });

  it('dismisses on Escape without moving focus and reopens after refocus', async () => {
    const user = userEvent.setup();
    const { overview } = renderCompactOutline();

    await user.tab();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(overview).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.tab();
    await user.tab({ shift: true });
    expect(overview).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
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
    await waitFor(() =>
      expect(screen.getByRole('tooltip')).toHaveTextContent('H3A very long implementation section'),
    );

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

  it('clears the old position before showing a different heading tooltip', async () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    const { implementation, overview } = renderCompactOutline();

    fireEvent.mouseEnter(implementation);
    act(() => frameCallbacks.shift()?.(0));
    expect(screen.getByRole('tooltip')).toHaveTextContent('H3A very long implementation section');

    fireEvent.mouseEnter(overview);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => frameCallbacks.shift()?.(16));
    expect(screen.getByRole('tooltip')).toHaveTextContent('H1Overview');
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

    await user.click(screen.getByRole('link', { name: 'A very long implementation section, H3' }));

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
      name: 'A very long implementation section, H3',
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

    const overview = screen.getByRole('link', { name: 'Overview, H1' });
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
      name: 'A very long implementation section, H3',
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

    const activeItem = screen.getByRole('link', { name: 'Overview, H1' });
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
