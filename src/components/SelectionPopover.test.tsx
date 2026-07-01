import { RefObject, useRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectionPopover } from './SelectionPopover';

function TestHarness({ onSubmitComment }: { onSubmitComment?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div ref={containerRef} data-testid="content">
        <p data-line-start="1">Selected text</p>
      </div>
      <SelectionPopover
        containerRef={containerRef as RefObject<HTMLElement | null>}
        onSubmitComment={onSubmitComment}
      />
    </div>
  );
}

describe('SelectionPopover', () => {
  function selectParagraphText(paragraph: HTMLElement, top = 120) {
    const textNode = paragraph.firstChild;
    if (!textNode) {
      throw new Error('Expected text node');
    }

    const range = {
      startContainer: textNode,
      startOffset: 0,
      endContainer: textNode,
      endOffset: 'Selected text'.length,
      cloneRange: vi.fn(() => range),
      getBoundingClientRect: vi.fn(() => ({
        left: 40,
        top,
        width: 160,
        height: 20,
        right: 200,
        bottom: top + 20,
        x: 40,
        y: top,
        toJSON: () => undefined,
      })),
      getClientRects: vi.fn(() => [
        {
          left: 40,
          top,
          width: 160,
          height: 20,
          right: 200,
          bottom: top + 20,
          x: 40,
          y: top,
          toJSON: () => undefined,
        },
      ]),
    } as unknown as Range;

    const selection = {
      isCollapsed: false,
      anchorNode: textNode,
      anchorOffset: 0,
      focusNode: textNode,
      focusOffset: 'Selected text'.length,
      getRangeAt: vi.fn(() => range),
      toString: vi.fn(() => 'Selected text'),
    } as unknown as Selection;

    vi.spyOn(window, 'getSelection').mockReturnValue(selection);

    act(() => {
      paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    return range;
  }

  it('keeps the popover anchored to the selected range when the page scrolls', async () => {
    render(<TestHarness />);

    const paragraph = screen.getByText('Selected text');
    const textNode = paragraph.firstChild;
    if (!textNode) {
      throw new Error('Expected text node');
    }

    let selectionTop = 120;
    const range = {
      startContainer: textNode,
      startOffset: 0,
      endContainer: textNode,
      endOffset: 'Selected text'.length,
      cloneRange: vi.fn(() => range),
      getBoundingClientRect: vi.fn(() => ({
        left: 40,
        top: selectionTop,
        width: 160,
        height: 20,
        right: 200,
        bottom: selectionTop + 20,
        x: 40,
        y: selectionTop,
        toJSON: () => undefined,
      })),
      getClientRects: vi.fn(() => []),
    } as unknown as Range;

    const selection = {
      isCollapsed: false,
      anchorNode: textNode,
      anchorOffset: 0,
      focusNode: textNode,
      focusOffset: 'Selected text'.length,
      getRangeAt: vi.fn(() => range),
      toString: vi.fn(() => 'Selected text'),
    } as unknown as Selection;

    vi.spyOn(window, 'getSelection').mockReturnValue(selection);

    act(() => {
      paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    const button = await screen.findByRole('button', { name: 'Comment' });
    await waitFor(() => {
      expect(button.parentElement).toHaveStyle({ top: '112px' });
    });

    selectionTop = 80;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => {
      expect(button.parentElement).toHaveStyle({ top: '72px' });
    });
  });

  it('closes the inline editor when clicking outside it', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    selectParagraphText(screen.getByText('Selected text'));

    await user.click(await screen.findByRole('button', { name: 'Comment' }));
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
  });
});
