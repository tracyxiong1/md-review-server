import { useEffect, useId, useRef, useState } from 'react';
import type { DocumentHeading } from '../lib/extractDocumentHeadings';

interface DocumentOutlineProps {
  headings: DocumentHeading[];
  activeHeadingId: string | null;
  onNavigate: (headingId: string) => void;
}

interface OutlineTooltip {
  heading: DocumentHeading;
  maxHeight: number;
  source: 'focus' | 'pointer';
  top: number;
  width: number;
}

const TOOLTIP_GAP = 8;
const TOOLTIP_INSET = 12;
const TOOLTIP_MAX_HEIGHT = 96;
const TOOLTIP_MAX_WIDTH = 280;

export const DocumentOutline = ({
  headings,
  activeHeadingId,
  onNavigate,
}: DocumentOutlineProps) => {
  const columnRef = useRef<HTMLElement>(null);
  const outlineRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<OutlineTooltip | null>(null);

  const showTooltip = (
    heading: DocumentHeading,
    target: HTMLAnchorElement,
    source: OutlineTooltip['source'],
  ) => {
    const column = columnRef.current;
    const card = column?.closest<HTMLElement>('.markdown-content');
    if (!column || !card) return;

    const targetRect = target.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const minTop = cardRect.top - columnRect.top + TOOLTIP_INSET;
    const bottom = cardRect.bottom - columnRect.top - TOOLTIP_INSET;
    const maxHeight = Math.min(TOOLTIP_MAX_HEIGHT, Math.max(0, bottom - minTop));
    const maxTop = Math.max(minTop, bottom - maxHeight);
    const top = Math.min(maxTop, Math.max(minTop, targetRect.top - columnRect.top - TOOLTIP_GAP));
    const width = Math.min(
      TOOLTIP_MAX_WIDTH,
      Math.max(0, cardRect.right - columnRect.right - TOOLTIP_GAP - TOOLTIP_INSET),
    );

    setTooltip({ heading, maxHeight, source, top, width });
  };

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
    <aside ref={columnRef} className="document-outline-column">
      <nav ref={outlineRef} className="document-outline" aria-label="Document outline">
        <ol className="document-outline-list">
          {headings.map((heading) => {
            const isActive = heading.id === activeHeadingId;

            return (
              <li key={heading.id} className="document-outline-item">
                <a
                  ref={isActive ? activeItemRef : undefined}
                  className={isActive ? 'document-outline-link active' : 'document-outline-link'}
                  href={`#${heading.id}`}
                  title={heading.text}
                  data-level={heading.level}
                  aria-label={heading.text}
                  aria-current={isActive ? 'location' : undefined}
                  aria-describedby={tooltip?.heading.id === heading.id ? tooltipId : undefined}
                  style={{ paddingInlineStart: `${8 + (heading.level - 1) * 10}px` }}
                  onMouseEnter={(event) => showTooltip(heading, event.currentTarget, 'pointer')}
                  onMouseLeave={() => {
                    setTooltip((current) => (current?.source === 'pointer' ? null : current));
                  }}
                  onFocus={(event) => showTooltip(heading, event.currentTarget, 'focus')}
                  onBlur={() => {
                    setTooltip((current) => (current?.source === 'focus' ? null : current));
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(heading.id);
                  }}
                >
                  <span className="document-outline-label">{heading.text}</span>
                  <span className="document-outline-tick" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
      {tooltip && (
        <div
          id={tooltipId}
          className="document-outline-tooltip"
          role="tooltip"
          style={{ top: tooltip.top, width: tooltip.width, maxHeight: tooltip.maxHeight }}
        >
          <span className="document-outline-tooltip-level">H{tooltip.heading.level}</span>
          <span className="document-outline-tooltip-title">{tooltip.heading.text}</span>
        </div>
      )}
    </aside>
  );
};
