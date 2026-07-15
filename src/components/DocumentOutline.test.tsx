import { render, screen } from '@testing-library/react';
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

afterEach(() => {
  window.history.replaceState(null, '', window.location.pathname);
});

describe('DocumentOutline', () => {
  it('renders a semantic outline with hierarchy, active state, and full-text titles', () => {
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

    expect(implementation).toHaveAttribute('href', '#markdown-heading-3');
    expect(implementation).toHaveAttribute('data-level', '3');
    expect(implementation).toHaveAttribute('aria-label', 'A very long implementation section');
    expect(implementation).toHaveStyle({ paddingInlineStart: '28px' });
    expect(implementation).toHaveAttribute('title', 'A very long implementation section');
    expect(implementation.querySelector('.document-outline-label')).toHaveTextContent(
      'A very long implementation section',
    );
    expect(implementation.querySelector('.document-outline-tick')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(implementation).not.toHaveAttribute('aria-current');
    expect(implementation).not.toHaveClass('active');
    expect(implementation.tabIndex).toBe(0);
  });

  it('shows the heading level and full title in a constrained tooltip on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div className="markdown-content">
        <DocumentOutline
          headings={headings}
          activeHeadingId="markdown-heading-1"
          onNavigate={vi.fn()}
        />
      </div>,
    );
    const card = container.querySelector('.markdown-content');
    const column = container.querySelector('.document-outline-column');
    const implementation = screen.getByRole('link', {
      name: 'A very long implementation section',
    });

    vi.spyOn(card!, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 340,
      top: 50,
      bottom: 650,
      width: 240,
      height: 600,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });
    vi.spyOn(column!, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 132,
      top: 50,
      bottom: 650,
      width: 32,
      height: 600,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });
    vi.spyOn(implementation, 'getBoundingClientRect').mockReturnValue({
      left: 104,
      right: 128,
      top: 100,
      bottom: 120,
      width: 24,
      height: 20,
      x: 104,
      y: 100,
      toJSON: () => ({}),
    });

    await user.hover(implementation);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('H3');
    expect(tooltip).toHaveTextContent('A very long implementation section');
    expect(tooltip).toHaveStyle({ top: '42px', width: '188px', maxHeight: '96px' });
    expect(implementation).toHaveAttribute('aria-describedby', tooltip.id);

    await user.unhover(implementation);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows and hides the full-title tooltip with keyboard focus', async () => {
    const user = userEvent.setup();
    render(
      <div className="markdown-content">
        <DocumentOutline
          headings={headings}
          activeHeadingId="markdown-heading-1"
          onNavigate={vi.fn()}
        />
      </div>,
    );

    await user.tab();

    expect(screen.getByRole('tooltip')).toHaveTextContent('H1Overview');

    await user.tab();
    expect(screen.getByRole('tooltip')).toHaveTextContent('H3A very long implementation section');

    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
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
