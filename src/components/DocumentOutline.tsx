import { useEffect, useRef } from 'react';
import type { DocumentHeading } from '../lib/extractDocumentHeadings';

interface DocumentOutlineProps {
  headings: DocumentHeading[];
  activeHeadingId: string | null;
  onNavigate: (headingId: string) => void;
}

export const DocumentOutline = ({
  headings,
  activeHeadingId,
  onNavigate,
}: DocumentOutlineProps) => {
  const outlineRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

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
  }, [activeHeadingId]);

  return (
    <aside className="document-outline-column">
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
                  aria-current={isActive ? 'location' : undefined}
                  style={{ paddingInlineStart: `${8 + (heading.level - 1) * 10}px` }}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(heading.id);
                  }}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
};
