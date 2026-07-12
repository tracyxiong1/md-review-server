import { render, screen, waitFor } from '@testing-library/react';
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

  it('opens the rendered diagram in the large viewer and restores trigger focus', async () => {
    const user = userEvent.setup();
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg viewBox="0 0 1600 800">diagram</svg>',
      diagramType: 'sequence',
    });
    render(<MermaidBlock code="sequenceDiagram; A->>B: message" />);

    const trigger = await screen.findByRole('button', { name: '放大查看 Mermaid 图表' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Mermaid 图表查看器' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭大图' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('does not show the large-view entry when Mermaid rendering fails', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Invalid syntax'));
    render(<MermaidBlock code="invalid code" />);

    expect(await screen.findByText('Mermaid error: Invalid syntax')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '放大查看 Mermaid 图表' })).not.toBeInTheDocument();
  });
});
