import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DocumentHeading } from '../lib/extractDocumentHeadings';

interface DocumentOutlineProps {
  headings: DocumentHeading[];
  activeHeadingId: string | null;
  onNavigate: (headingId: string) => void;
}

interface TooltipPosition {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

const COMPACT_OUTLINE_WIDTH = 520;
const TOOLTIP_GAP = 8;
const TOOLTIP_INSET = 12;
const TOOLTIP_MAX_HEIGHT = 96;
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_MIN_HEIGHT = 44;
const TOOLTIP_MIN_WIDTH = 120;
const TICK_WIDTHS = [0, 18, 15, 12, 10, 8, 6] as const;

export const DocumentOutline = ({
  headings,
  activeHeadingId,
  onNavigate,
}: DocumentOutlineProps) => {
  const outlineRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const positionFrameRef = useRef<number | null>(null);
  const tooltipId = useId();
  const [isCompact, setIsCompact] = useState<boolean | null>(null);
  const [focusedHeadingId, setFocusedHeadingId] = useState<string | null>(null);
  const [hoveredHeadingId, setHoveredHeadingId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const tooltipHeadingId = hoveredHeadingId ?? focusedHeadingId;
  const tooltipHeading = headings.find((heading) => heading.id === tooltipHeadingId) ?? null;

  const updateTooltipPosition = useCallback(() => {
    if (!tooltipHeadingId) {
      setTooltipPosition(null);
      return;
    }

    const target = linkRefs.current.get(tooltipHeadingId);
    const card = target?.closest<HTMLElement>('.markdown-content');
    const preview = target?.closest<HTMLElement>('.markdown-container');
    if (!target || !card || !preview) {
      setTooltipPosition(null);
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    const compactWidth = card.clientWidth || cardRect.width;
    if (compactWidth >= COMPACT_OUTLINE_WIDTH) {
      setTooltipPosition(null);
      return;
    }

    const comments = preview
      .closest('.markdown-with-comments')
      ?.querySelector<HTMLElement>('.comments-sidebar:not(.comments-sidebar-collapsed)');
    const commentsRect = comments?.getBoundingClientRect();
    const visibleLeft = Math.max(0, previewRect.left);
    const visibleRight = Math.min(
      window.innerWidth,
      previewRect.right,
      commentsRect?.left ?? Number.POSITIVE_INFINITY,
    );
    const visibleTop = Math.max(0, previewRect.top);
    const visibleBottom = Math.min(window.innerHeight, previewRect.bottom);
    const leftBound = visibleLeft + TOOLTIP_INSET;
    const rightBound = visibleRight - TOOLTIP_INSET;
    const topBound = visibleTop + TOOLTIP_INSET;
    const bottomBound = visibleBottom - TOOLTIP_INSET;
    const availableWidth = rightBound - leftBound;
    const availableHeight = bottomBound - topBound;

    if (
      availableWidth < TOOLTIP_MIN_WIDTH ||
      availableHeight < TOOLTIP_MIN_HEIGHT ||
      targetRect.bottom <= visibleTop ||
      targetRect.top >= visibleBottom
    ) {
      setTooltipPosition(null);
      return;
    }

    const desiredLeft = targetRect.right + TOOLTIP_GAP;
    const availableRight = rightBound - desiredLeft;
    const fitsBesideRail = availableRight >= TOOLTIP_MIN_WIDTH;
    const width = Math.min(TOOLTIP_MAX_WIDTH, fitsBesideRail ? availableRight : availableWidth);
    const left = fitsBesideRail ? desiredLeft : leftBound;
    const maxHeight = Math.min(TOOLTIP_MAX_HEIGHT, availableHeight);
    const maxTop = bottomBound - maxHeight;
    const top = Math.min(maxTop, Math.max(topBound, targetRect.top - TOOLTIP_GAP));

    setTooltipPosition({ left, maxHeight, top, width });
  }, [tooltipHeadingId]);

  useEffect(() => {
    const target = tooltipHeadingId ? linkRefs.current.get(tooltipHeadingId) : null;
    const card =
      target?.closest<HTMLElement>('.markdown-content') ??
      outlineRef.current?.closest<HTMLElement>('.markdown-content');
    const preview = target?.closest<HTMLElement>('.markdown-container');
    const comments = preview
      ?.closest('.markdown-with-comments')
      ?.querySelector<HTMLElement>('.comments-sidebar:not(.comments-sidebar-collapsed)');
    const updateCompactMode = () => {
      if (!card) return;
      const cardWidth = card.clientWidth || card.getBoundingClientRect().width;
      setIsCompact(cardWidth < COMPACT_OUTLINE_WIDTH);
    };
    const schedulePositionUpdate = () => {
      if (positionFrameRef.current !== null) return;
      positionFrameRef.current = window.requestAnimationFrame(() => {
        positionFrameRef.current = null;
        updateTooltipPosition();
      });
    };
    const handleResize = () => {
      updateCompactMode();
      if (tooltipHeadingId) schedulePositionUpdate();
    };
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;

    if (target) resizeObserver?.observe(target);
    if (card) resizeObserver?.observe(card);
    if (preview) resizeObserver?.observe(preview);
    if (outlineRef.current) resizeObserver?.observe(outlineRef.current);
    if (comments) resizeObserver?.observe(comments);
    if (tooltipHeadingId) window.addEventListener('scroll', schedulePositionUpdate, true);
    window.addEventListener('resize', handleResize);
    updateCompactMode();
    if (tooltipHeadingId) schedulePositionUpdate();

    return () => {
      window.removeEventListener('scroll', schedulePositionUpdate, true);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      if (positionFrameRef.current !== null) {
        window.cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
    };
  }, [tooltipHeadingId, updateTooltipPosition]);

  useEffect(() => {
    const outline = outlineRef.current;
    const activeItem = activeItemRef.current;
    if (!outline || !activeItem) return;

    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;

    if (itemTop < outline.scrollTop) {
      outline.scrollTop = itemTop;
    } else if (itemBottom > outline.scrollTop + outline.clientHeight) {
      outline.scrollTop = itemBottom - outline.clientHeight;
    }
  }, [activeHeadingId, headings]);

  return (
    <aside className="document-outline-column">
      <nav ref={outlineRef} className="document-outline" aria-label="Document outline">
        <ol className="document-outline-list">
          {headings.map((heading) => {
            const isActive = heading.id === activeHeadingId;

            return (
              <li key={heading.id} className="document-outline-item">
                <a
                  ref={(node) => {
                    if (node) {
                      linkRefs.current.set(heading.id, node);
                    } else {
                      linkRefs.current.delete(heading.id);
                    }
                    if (isActive) activeItemRef.current = node;
                  }}
                  className={isActive ? 'document-outline-link active' : 'document-outline-link'}
                  href={`#${heading.id}`}
                  title={isCompact === false ? heading.text : undefined}
                  data-level={heading.level}
                  aria-label={heading.text}
                  aria-current={isActive ? 'location' : undefined}
                  aria-describedby={
                    tooltipPosition && tooltipHeadingId === heading.id ? tooltipId : undefined
                  }
                  style={{ paddingInlineStart: `${8 + (heading.level - 1) * 10}px` }}
                  onMouseEnter={() => setHoveredHeadingId(heading.id)}
                  onMouseLeave={() => setHoveredHeadingId(null)}
                  onFocus={() => setFocusedHeadingId(heading.id)}
                  onBlur={() => setFocusedHeadingId(null)}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(heading.id);
                  }}
                >
                  <span className="document-outline-label">{heading.text}</span>
                  <span
                    className="document-outline-tick"
                    aria-hidden="true"
                    style={{ width: `${TICK_WIDTHS[heading.level]}px` }}
                  />
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
      {tooltipHeading &&
        tooltipPosition &&
        createPortal(
          <div
            id={tooltipId}
            className="document-outline-tooltip"
            role="tooltip"
            style={{ position: 'fixed', ...tooltipPosition }}
          >
            <span className="document-outline-tooltip-level">H{tooltipHeading.level}</span>
            <span className="document-outline-tooltip-title">{tooltipHeading.text}</span>
          </div>,
          document.body,
        )}
    </aside>
  );
};
