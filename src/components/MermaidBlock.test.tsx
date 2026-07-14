import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MermaidBlock } from './MermaidBlock';
import mermaid from 'mermaid';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

const darkModeMock = vi.hoisted(() => ({ isDark: false }));

vi.mock('../hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDark: darkModeMock.isDark }),
}));

describe('MermaidBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    darkModeMock.isDark = false;
  });

  it('uses the readable native-neutral light palette', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg>diagram</svg>',
      diagramType: 'flowchart',
    });

    render(<MermaidBlock code="graph TD; A-->B" />);

    await waitFor(() => {
      expect(mermaid.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: expect.objectContaining({
            primaryTextColor: '#242424',
            lineColor: '#6f6f6b',
            actorTextColor: '#242424',
            signalTextColor: '#3f3f3c',
            labelTextColor: '#3f3f3c',
          }),
        }),
      );
      expect(document.querySelector('.mermaid-container')).toBeInTheDocument();
    });
  });

  it('uses the readable native-neutral dark palette', async () => {
    darkModeMock.isDark = true;
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg>diagram</svg>',
      diagramType: 'sequence',
    });

    render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

    await waitFor(() => {
      expect(mermaid.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: expect.objectContaining({
            background: '#1b1b1b',
            primaryTextColor: '#f2f2f2',
            lineColor: '#a0a0a0',
            actorTextColor: '#f2f2f2',
            signalTextColor: '#d6d6d3',
            labelTextColor: '#d6d6d3',
            noteTextColor: '#eeeeec',
          }),
        }),
      );
    });
  });

  it('should display error when rendering fails', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Invalid syntax'));

    render(<MermaidBlock code="invalid code" />);

    await waitFor(() => {
      expect(screen.getByText('Mermaid error: Invalid syntax')).toBeInTheDocument();
    });
  });

  it('restores trigger focus without a focus ring after a pointer close', async () => {
    const user = userEvent.setup();
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
      diagramType: 'sequence',
    });
    render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

    const trigger = await screen.findByRole('button', { name: '放大查看 Mermaid 图表' });
    expect(trigger).toHaveAttribute('title', '放大查看');
    expect(trigger).toHaveTextContent('');
    expect(trigger.querySelector('svg')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Mermaid 图表查看器' })).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: '关闭大图' });
    expect(closeButton).toHaveAttribute('data-suppress-focus-ring', 'true');
    await user.click(closeButton);

    expect(screen.queryByRole('dialog', { name: 'Mermaid 图表查看器' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('data-suppress-focus-ring', 'true');
  });

  it('restores trigger focus without a focus ring after pointer-opened Escape', async () => {
    const user = userEvent.setup();
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
      diagramType: 'sequence',
    });
    render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

    const trigger = await screen.findByRole('button', { name: '放大查看 Mermaid 图表' });
    await user.click(trigger);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Mermaid 图表查看器' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('data-suppress-focus-ring', 'true');
  });

  it('uses keyboard focus semantics for detail-zero trigger and close activations', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
      diagramType: 'sequence',
    });
    render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

    const trigger = await screen.findByRole('button', { name: '放大查看 Mermaid 图表' });
    trigger.focus();
    fireEvent.click(trigger, { detail: 0 });

    const closeButton = screen.getByRole('button', { name: '关闭大图' });
    expect(closeButton).toHaveFocus();
    expect(closeButton).toHaveAttribute('data-suppress-focus-ring', 'false');

    fireEvent.click(closeButton, { detail: 0 });

    expect(screen.queryByRole('dialog', { name: 'Mermaid 图表查看器' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('data-suppress-focus-ring', 'false');
  });

  it('restores trigger focus without a focus ring after a backdrop close', async () => {
    const user = userEvent.setup();
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
      diagramType: 'sequence',
    });
    render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

    const trigger = await screen.findByRole('button', { name: '放大查看 Mermaid 图表' });
    await user.click(trigger);

    const backdrop = document.querySelector('.mermaid-viewer-backdrop');
    expect(backdrop).toBeInTheDocument();
    fireEvent.mouseDown(backdrop!);

    expect(screen.queryByRole('dialog', { name: 'Mermaid 图表查看器' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('data-suppress-focus-ring', 'true');
  });

  it('uses the latest keyboard interaction when returning focus with Escape', async () => {
    const user = userEvent.setup();
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
      diagramType: 'sequence',
    });
    render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

    const trigger = await screen.findByRole('button', { name: '放大查看 Mermaid 图表' });
    await user.click(trigger);
    await user.tab();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('data-suppress-focus-ring', 'false');
  });

  it('clears pointer focus suppression after a new keyboard interaction', async () => {
    const user = userEvent.setup();
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
      diagramType: 'sequence',
    });
    render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

    const trigger = await screen.findByRole('button', { name: '放大查看 Mermaid 图表' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '关闭大图' }));
    expect(trigger).toHaveAttribute('data-suppress-focus-ring', 'true');

    fireEvent.keyDown(trigger, { key: 'Tab' });

    expect(trigger).toHaveAttribute('data-suppress-focus-ring', 'false');
  });

  it('does not show the large-view entry when Mermaid rendering fails', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Invalid syntax'));
    render(<MermaidBlock code="invalid code" />);

    expect(await screen.findByText('Mermaid error: Invalid syntax')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '放大查看 Mermaid 图表' })).not.toBeInTheDocument();
  });
});
