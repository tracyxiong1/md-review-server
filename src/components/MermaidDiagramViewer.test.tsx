import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidDiagramViewer } from './MermaidDiagramViewer';

const svg = '<svg viewBox="0 0 1600 800"><text>diagram</text></svg>';

describe('MermaidDiagramViewer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      right: 800,
      bottom: 600,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  it('renders an accessible dialog and closes with Escape', () => {
    const onClose = vi.fn();
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="keyboard" onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Mermaid 图表查看器' })).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: '关闭大图' });
    expect(closeButton).toHaveFocus();
    expect(closeButton).toHaveAttribute('data-suppress-focus-ring', 'false');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledWith('keyboard');
  });

  it('closes from the close button and restores body scrolling', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = render(
      <MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={onClose} />,
    );

    expect(document.body).toHaveStyle({ overflow: 'hidden' });
    await user.click(screen.getByRole('button', { name: '关闭大图' }));
    expect(onClose).toHaveBeenCalledWith('pointer');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('reports keyboard activation from the close button', () => {
    const onClose = vi.fn();
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="keyboard" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '关闭大图' }), { detail: 0 });

    expect(onClose).toHaveBeenCalledWith('keyboard');
  });

  it('reports pointer activation from a backdrop mouse down', () => {
    const onClose = vi.fn();
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={onClose} />);

    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);

    expect(onClose).toHaveBeenCalledWith('pointer');
  });

  it('suppresses pointer-opened initial focus ring until keyboard input reaches the dialog', () => {
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={vi.fn()} />);
    const closeButton = screen.getByRole('button', { name: '关闭大图' });

    expect(closeButton).toHaveFocus();
    expect(closeButton).toHaveAttribute('data-suppress-focus-ring', 'true');

    fireEvent.keyDown(closeButton, { key: 'Tab' });

    expect(closeButton).toHaveAttribute('data-suppress-focus-ring', 'false');
  });

  it('does not suppress a later focus after the pointer-opened initial focus blurs', () => {
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={vi.fn()} />);
    const closeButton = screen.getByRole('button', { name: '关闭大图' });

    expect(closeButton).toHaveAttribute('data-suppress-focus-ring', 'true');

    const zoomOutButton = screen.getByRole('button', { name: '缩小图表' });
    act(() => zoomOutButton.focus());
    expect(zoomOutButton).toHaveFocus();

    act(() => closeButton.focus());

    expect(closeButton).toHaveFocus();
    expect(closeButton).toHaveAttribute('data-suppress-focus-ring', 'false');
  });

  it('zooms from the toolbar and restores fit scale from the percentage button', async () => {
    const user = userEvent.setup();
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={vi.fn()} />);

    const scaleButton = screen.getByRole('button', {
      name: '当前比例，点击适应窗口',
    });
    expect(scaleButton).toHaveTextContent('50%');

    await user.click(screen.getByRole('button', { name: '放大图表' }));
    expect(scaleButton).toHaveTextContent('75%');

    await user.click(scaleButton);
    expect(scaleButton).toHaveTextContent('50%');
  });

  it('uses ordinary wheel input for pan and modifier wheel input for zoom', () => {
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={vi.fn()} />);
    const viewport = screen.getByTestId('mermaid-viewer-viewport');
    const diagram = screen.getByTestId('mermaid-viewer-diagram');

    fireEvent.wheel(viewport, { deltaX: 20, deltaY: 30 });
    expect(diagram.style.transform).toContain('translate(-20px, 70px)');

    fireEvent.wheel(viewport, {
      deltaY: -20,
      ctrlKey: true,
      clientX: 400,
      clientY: 300,
    });
    expect(screen.getByRole('button', { name: '当前比例，点击适应窗口' })).not.toHaveTextContent(
      '50%',
    );
  });

  it('registers a non-passive wheel listener on the diagram viewport', () => {
    const addEventListener = vi.spyOn(HTMLDivElement.prototype, 'addEventListener');

    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={vi.fn()} />);

    expect(addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function), {
      passive: false,
    });
  });

  it('does not zoom when a modifier wheel event starts outside the diagram viewport', () => {
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={vi.fn()} />);
    const scaleButton = screen.getByRole('button', {
      name: '当前比例，点击适应窗口',
    });

    fireEvent.wheel(document.body, {
      deltaY: -20,
      ctrlKey: true,
      clientX: 400,
      clientY: 300,
    });

    expect(scaleButton).toHaveTextContent('50%');
  });

  it('moves the diagram with pointer drag', () => {
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={vi.fn()} />);
    const viewport = screen.getByTestId('mermaid-viewer-viewport');
    const diagram = screen.getByTestId('mermaid-viewer-diagram');

    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 140, clientY: 125 });
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 140, clientY: 125 });

    expect(diagram.style.transform).toContain('translate(40px, 125px)');
    expect(viewport).toHaveAttribute('data-dragging', 'false');
  });

  it('preserves a manually adjusted scale when the window resizes', async () => {
    const user = userEvent.setup();
    render(<MermaidDiagramViewer svg={svg} initialFocusMethod="pointer" onClose={vi.fn()} />);
    const scaleButton = screen.getByRole('button', {
      name: '当前比例，点击适应窗口',
    });

    await user.click(screen.getByRole('button', { name: '放大图表' }));
    expect(scaleButton).toHaveTextContent('75%');

    fireEvent(window, new Event('resize'));
    expect(scaleButton).toHaveTextContent('75%');
  });
});
