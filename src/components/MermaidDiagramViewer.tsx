import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  MAX_DIAGRAM_SCALE,
  MIN_DIAGRAM_SCALE,
  clampScale,
  fitScale,
  type DiagramTransform,
  type Size,
  zoomAtPoint,
} from '../lib/diagramViewport';

interface MermaidDiagramViewerProps {
  svg: string;
  onClose: () => void;
}

const ZOOM_STEP = 0.25;

const readDiagramSize = (svg: string): Size => {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const element = document.documentElement;
  const viewBox = element.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number);

  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  return {
    width: Number.parseFloat(element.getAttribute('width') ?? '0'),
    height: Number.parseFloat(element.getAttribute('height') ?? '0'),
  };
};

export const MermaidDiagramViewer = ({ svg, onClose }: MermaidDiagramViewerProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const diagramSizeRef = useRef(readDiagramSize(svg));
  const [transform, setTransform] = useState<DiagramTransform>({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const viewportRect = useCallback(() => viewportRef.current?.getBoundingClientRect(), []);

  const fitDiagram = useCallback(() => {
    const rect = viewportRect();
    if (!rect) return;

    const diagram = diagramSizeRef.current;
    const scale = fitScale(diagram, { width: rect.width, height: rect.height });
    setTransform({
      scale,
      x: (rect.width - diagram.width * scale) / 2,
      y: (rect.height - diagram.height * scale) / 2,
    });
  }, [viewportRect]);

  const zoomFromCenter = useCallback(
    (nextScale: number) => {
      const rect = viewportRect();
      if (!rect) return;
      setTransform((current) =>
        zoomAtPoint(
          current,
          nextScale,
          { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          { x: rect.left, y: rect.top },
        ),
      );
    },
    [viewportRect],
  );

  useLayoutEffect(() => {
    fitDiagram();
  }, [fitDiagram]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    const handleResize = () => fitDiagram();

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = previousOverflow;
    };
  }, [fitDiagram, onClose]);

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const rect = viewportRect();
      if (!rect) return;
      setTransform((current) =>
        zoomAtPoint(
          current,
          current.scale * Math.exp(-event.deltaY * 0.01),
          { x: event.clientX, y: event.clientY },
          { x: rect.left, y: rect.top },
        ),
      );
      return;
    }

    setTransform((current) => ({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setTransform((current) => ({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY,
    }));
  };

  const endPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsDragging(false);
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = viewportRect();
    if (!rect) return;
    setTransform((current) =>
      zoomAtPoint(
        current,
        current.scale + ZOOM_STEP,
        { x: event.clientX, y: event.clientY },
        { x: rect.left, y: rect.top },
      ),
    );
  };

  return createPortal(
    <div
      className="mermaid-viewer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="mermaid-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Mermaid 图表查看器"
      >
        <div className="mermaid-viewer-toolbar" aria-label="图表缩放控件">
          <button
            type="button"
            aria-label="缩小图表"
            disabled={transform.scale <= MIN_DIAGRAM_SCALE}
            onClick={() => zoomFromCenter(transform.scale - ZOOM_STEP)}
          >
            −
          </button>
          <button type="button" aria-label="当前比例，点击适应窗口" onClick={fitDiagram}>
            {Math.round(transform.scale * 100)}%
          </button>
          <button
            type="button"
            aria-label="放大图表"
            disabled={transform.scale >= MAX_DIAGRAM_SCALE}
            onClick={() => zoomFromCenter(transform.scale + ZOOM_STEP)}
          >
            ＋
          </button>
          <button ref={closeRef} type="button" aria-label="关闭大图" onClick={onClose}>
            ×
          </button>
        </div>
        <div
          ref={viewportRef}
          className="mermaid-viewer-viewport"
          data-testid="mermaid-viewer-viewport"
          data-dragging={isDragging}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
          onDoubleClick={handleDoubleClick}
        >
          <div
            className="mermaid-viewer-diagram"
            data-testid="mermaid-viewer-diagram"
            style={{
              width: diagramSizeRef.current.width,
              height: diagramSizeRef.current.height,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${clampScale(transform.scale)})`,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </section>
    </div>,
    document.body,
  );
};
