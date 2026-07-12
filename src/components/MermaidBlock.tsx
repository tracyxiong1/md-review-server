import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useDarkMode } from '../hooks/useDarkMode';
import { MermaidDiagramViewer } from './MermaidDiagramViewer';

interface MermaidBlockProps {
  code: string;
}

export const lightMermaidThemeVariables = {
  background: '#fafaf9',
  primaryColor: '#f1f1ef',
  primaryTextColor: '#242424',
  primaryBorderColor: '#b8b8b3',
  secondaryColor: '#e8e8e5',
  secondaryTextColor: '#242424',
  secondaryBorderColor: '#b8b8b3',
  tertiaryColor: '#fafaf9',
  tertiaryTextColor: '#242424',
  tertiaryBorderColor: '#d9d9d6',
  textColor: '#242424',
  lineColor: '#6f6f6b',
  mainBkg: '#f1f1ef',
  nodeBorder: '#b8b8b3',
  nodeTextColor: '#242424',
  clusterBkg: '#fafaf9',
  clusterBorder: '#d9d9d6',
  titleColor: '#242424',
  edgeLabelBackground: '#fafaf9',
  actorBkg: '#f1f1ef',
  actorBorder: '#b8b8b3',
  actorTextColor: '#242424',
  actorLineColor: '#8a8a85',
  signalColor: '#6f6f6b',
  signalTextColor: '#3f3f3c',
  labelBoxBkgColor: '#f1f1ef',
  labelBoxBorderColor: '#b8b8b3',
  labelTextColor: '#3f3f3c',
  loopTextColor: '#3f3f3c',
  noteBorderColor: '#c8c8c3',
  noteBkgColor: '#f6f1dc',
  noteTextColor: '#3f3f3c',
  activationBorderColor: '#8a8a85',
  activationBkgColor: '#e8e8e5',
  sequenceNumberColor: '#242424',
};

export const darkMermaidThemeVariables = {
  background: '#1b1b1b',
  primaryColor: '#2a2a2a',
  primaryTextColor: '#f2f2f2',
  primaryBorderColor: '#66635f',
  secondaryColor: '#232323',
  secondaryTextColor: '#eeeeec',
  secondaryBorderColor: '#56534f',
  tertiaryColor: '#303030',
  tertiaryTextColor: '#eeeeec',
  tertiaryBorderColor: '#66635f',
  textColor: '#eeeeec',
  lineColor: '#a0a0a0',
  mainBkg: '#2a2a2a',
  nodeBorder: '#66635f',
  nodeTextColor: '#eeeeec',
  clusterBkg: '#1b1b1b',
  clusterBorder: '#4b4b48',
  titleColor: '#f2f2f2',
  edgeLabelBackground: '#252525',
  actorBkg: '#2a2a2a',
  actorBorder: '#66635f',
  actorTextColor: '#f2f2f2',
  actorLineColor: '#a0a0a0',
  signalColor: '#b0b0ad',
  signalTextColor: '#d6d6d3',
  labelBoxBkgColor: '#303030',
  labelBoxBorderColor: '#66635f',
  labelTextColor: '#d6d6d3',
  loopTextColor: '#d6d6d3',
  noteBorderColor: '#716b55',
  noteBkgColor: '#332f22',
  noteTextColor: '#eeeeec',
  activationBorderColor: '#77736e',
  activationBkgColor: '#343434',
  sequenceNumberColor: '#f2f2f2',
};

export const MermaidBlock = ({ code }: MermaidBlockProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { isDark } = useDarkMode();

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: isDark ? darkMermaidThemeVariables : lightMermaidThemeVariables,
          securityLevel: 'strict',
        });

        const id = `mermaid-${crypto.randomUUID()}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvg('');
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, isDark]);

  if (error) {
    return (
      <div className="mermaid-error">
        <pre>{code}</pre>
        <p className="mermaid-error-message">Mermaid error: {error}</p>
      </div>
    );
  }

  const closeViewer = () => {
    setIsViewerOpen(false);
    expandButtonRef.current?.focus();
  };

  return (
    <div className="mermaid-block">
      {svg && (
        <button
          ref={expandButtonRef}
          type="button"
          className="mermaid-expand-button"
          aria-label="放大查看 Mermaid 图表"
          title="放大查看"
          onClick={() => setIsViewerOpen(true)}
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
            <path d="M6 3H3v3M10 3h3v3M6 13H3v-3M10 13h3v-3" />
          </svg>
        </button>
      )}
      <div
        ref={containerRef}
        className="mermaid-container"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {isViewerOpen && <MermaidDiagramViewer svg={svg} onClose={closeViewer} />}
    </div>
  );
};
