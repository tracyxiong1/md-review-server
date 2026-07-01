import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { clampFloatingRect } from '../lib/clampFloatingRect';

interface PopoverPosition {
  x: number;
  y: number;
}

interface SavedSelection {
  range: Range;
  text: string;
  startLine: number;
  endLine: number;
  startOffset?: number;
  endOffset?: number;
  beforeText?: string;
  afterText?: string;
}

interface SelectionPopoverProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onSubmitComment?: (
    comment: string,
    selectedText: string,
    startLine: number,
    endLine: number,
    startOffset?: number,
    endOffset?: number,
    beforeText?: string,
    afterText?: string,
  ) => void;
}

// Get line number at selection point
function getLineAtSelectionPoint(node: Node, intraOffset: number): number | null {
  let el: HTMLElement | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);

  while (el && !el.hasAttribute('data-line-start')) {
    el = el.parentElement;
  }
  if (!el) return null;

  const startLine = Number(el.getAttribute('data-line-start'));
  if (!Number.isFinite(startLine)) return null;

  const text = node.nodeType === Node.TEXT_NODE ? (node as Text).data : '';
  const fragment = text.slice(0, intraOffset);
  const extraNewlines = (fragment.match(/\n/g) || []).length;

  return startLine + extraNewlines;
}

// Get line range from selection
function getSelectionLineRange(sel: Selection): { startLine: number; endLine: number } | null {
  if (sel.isCollapsed) return null;

  const { anchorNode, anchorOffset, focusNode, focusOffset } = sel;
  if (!anchorNode || !focusNode) return null;

  const anchorLine = getLineAtSelectionPoint(anchorNode, anchorOffset);
  const focusLine = getLineAtSelectionPoint(focusNode, focusOffset);

  if (anchorLine == null || focusLine == null) return null;

  const startLine = Math.min(anchorLine, focusLine);
  let endLine = Math.max(anchorLine, focusLine);

  const selectedText = sel.toString();
  if (selectedText.endsWith('\n') && startLine < endLine) {
    const trimmedText = selectedText.replace(/\n+$/, '');
    const actualNewlines = (trimmedText.match(/\n/g) || []).length;
    endLine = startLine + actualNewlines;
  }

  return { startLine, endLine };
}

function getLineOffset(node: Node, intraOffset: number): number | undefined {
  if (node.nodeType !== Node.TEXT_NODE) return undefined;

  const text = (node as Text).data;
  const fragment = text.slice(0, intraOffset);
  const lastNewline = fragment.lastIndexOf('\n');
  return lastNewline === -1 ? fragment.length : fragment.length - lastNewline - 1;
}

function getSelectionContext(range: Range): { beforeText?: string; afterText?: string } {
  const contextLength = 80;
  const startText =
    range.startContainer.nodeType === Node.TEXT_NODE ? (range.startContainer as Text).data : '';
  const endText =
    range.endContainer.nodeType === Node.TEXT_NODE ? (range.endContainer as Text).data : '';

  return {
    beforeText: startText.slice(Math.max(0, range.startOffset - contextLength), range.startOffset),
    afterText: endText.slice(range.endOffset, range.endOffset + contextLength),
  };
}

export const SelectionPopover = ({ containerRef, onSubmitComment }: SelectionPopoverProps) => {
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [savedSelection, setSavedSelection] = useState<SavedSelection | null>(null);
  const [formMaxHeight, setFormMaxHeight] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<SavedSelection | null>(null);
  const isEditingRef = useRef(false);

  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    [],
  );

  // Create or update highlight elements
  const updateHighlight = useCallback(
    (range: Range | null) => {
      // Remove existing highlight
      if (highlightRef.current) {
        highlightRef.current.remove();
        highlightRef.current = null;
      }

      if (!range || !containerRef.current) return;

      const rects = range.getClientRects();
      if (rects.length === 0) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.className = 'selection-highlight-container';
      highlight.style.position = 'absolute';
      highlight.style.top = '0';
      highlight.style.left = '0';
      highlight.style.pointerEvents = 'none';

      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const span = document.createElement('div');
        span.className = 'selection-highlight';
        span.style.position = 'absolute';
        span.style.left = `${rect.left - containerRect.left + containerRef.current.scrollLeft}px`;
        span.style.top = `${rect.top - containerRect.top + containerRef.current.scrollTop}px`;
        span.style.width = `${rect.width}px`;
        span.style.height = `${rect.height}px`;
        highlight.appendChild(span);
      }

      containerRef.current.style.position = 'relative';
      containerRef.current.appendChild(highlight);
      highlightRef.current = highlight;
    },
    [containerRef],
  );

  const updateFormMaxHeightFromRect = useCallback((rect: DOMRect) => {
    const minTopPadding = 8;
    const gapFromSelection = 8;
    const availableHeight = rect.top - minTopPadding - gapFromSelection;
    const defaultMaxHeight = 300;

    if (availableHeight < defaultMaxHeight && availableHeight > 0) {
      setFormMaxHeight(availableHeight);
    } else {
      setFormMaxHeight(null);
    }
  }, []);

  const updatePositionFromRange = useCallback(
    (range: Range, editing = isEditingRef.current) => {
      const gapFromSelection = 8;
      const viewportPadding = 12;

      if (editing) {
        const rects = range.getClientRects();
        if (rects.length === 0) return;

        let topRect = rects[0];
        for (let i = 1; i < rects.length; i++) {
          if (rects[i].top < topRect.top) {
            topRect = rects[i];
          }
        }

        updateFormMaxHeightFromRect(topRect);
        const popoverRect = popoverRef.current?.getBoundingClientRect();
        const popoverWidth = popoverRect?.width || Math.min(420, window.innerWidth - 24);
        const popoverHeight = popoverRect?.height || 150;
        let top = topRect.top - popoverHeight - gapFromSelection;

        if (top < viewportPadding) {
          top = topRect.bottom + gapFromSelection;
        }

        const nextPosition = clampFloatingRect({
          left: topRect.left,
          top,
          width: popoverWidth,
          height: popoverHeight,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          padding: viewportPadding,
        });

        setPosition({
          x: nextPosition.left,
          y: nextPosition.top,
        });
        return;
      }

      const rect = range.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - gapFromSelection,
      });
    },
    [updateFormMaxHeightFromRect],
  );

  const updatePosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      // Keep highlight while editing
      if (!isEditing) {
        setVisible(false);
        savedSelectionRef.current = null;
        setSavedSelection(null);
        updateHighlight(null);
      }
      return;
    }

    const anchorNode = sel.anchorNode;
    if (!anchorNode || !containerRef.current.contains(anchorNode)) {
      if (!isEditing) {
        setVisible(false);
        savedSelectionRef.current = null;
        setSavedSelection(null);
        updateHighlight(null);
      }
      return;
    }

    const range = sel.getRangeAt(0);
    // Get line numbers
    const lineRange = getSelectionLineRange(sel);
    const { beforeText, afterText } = getSelectionContext(range);

    // Save selection range
    const nextSavedSelection = {
      range: range.cloneRange(),
      text: sel.toString(),
      startLine: lineRange?.startLine ?? 1,
      endLine: lineRange?.endLine ?? 1,
      startOffset: getLineOffset(range.startContainer, range.startOffset),
      endOffset: getLineOffset(range.endContainer, range.endOffset),
      beforeText,
      afterText,
    };
    savedSelectionRef.current = nextSavedSelection;
    setSavedSelection(nextSavedSelection);

    updatePositionFromRange(range);
    setVisible(true);
  }, [containerRef, isEditing, updateHighlight, updatePositionFromRange]);

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Highlight current selection
    if (savedSelection) {
      updateHighlight(savedSelection.range);

      // Position input above the selection
      updatePositionFromRange(savedSelection.range, true);
    }

    setIsEditing(true);
    isEditingRef.current = true;
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const resetPopover = useCallback(() => {
    setComment('');
    setIsEditing(false);
    isEditingRef.current = false;
    setVisible(false);
    savedSelectionRef.current = null;
    setSavedSelection(null);
    updateHighlight(null);
    setFormMaxHeight(null);
    window.getSelection()?.removeAllRanges?.();
  }, [updateHighlight]);

  const handleSubmit = () => {
    if (comment.trim() && onSubmitComment && savedSelection) {
      onSubmitComment(
        comment.trim(),
        savedSelection.text,
        savedSelection.startLine,
        savedSelection.endLine,
        savedSelection.startOffset,
        savedSelection.endOffset,
        savedSelection.beforeText,
        savedSelection.afterText,
      );
    }
    resetPopover();
  };

  const handleCancel = useCallback(() => {
    resetPopover();
  }, [resetPopover]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      setTimeout(() => {
        if ((e.target as HTMLElement)?.closest('.selection-popover')) {
          return;
        }
        if (!isEditingRef.current) {
          updatePosition();
        }
      }, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('.selection-popover')) {
        return;
      }
      if (isEditingRef.current) {
        handleCancel();
        return;
      }
      if (!isEditingRef.current) {
        setVisible(false);
        savedSelectionRef.current = null;
        setSavedSelection(null);
        updateHighlight(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleCancel, updatePosition, updateHighlight]);

  useEffect(() => {
    if (!visible || !isEditing || !savedSelection) return;

    requestAnimationFrame(() => {
      updatePositionFromRange(savedSelection.range, true);
    });
  }, [visible, isEditing, savedSelection, updatePositionFromRange]);

  useEffect(() => {
    if (!visible) return;

    const handleViewportChange = () => {
      const currentSelection = savedSelectionRef.current;
      if (!currentSelection) return;
      updatePositionFromRange(currentSelection.range);
    };

    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [visible, updatePositionFromRange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (highlightRef.current) {
        highlightRef.current.remove();
      }
    };
  }, []);

  if (!visible || !position) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className="selection-popover"
      data-testid={isEditing ? 'inline-comment-editor' : 'selection-comment-popover'}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: isEditing ? undefined : 'translate(-50%, -100%)',
      }}
    >
      {!isEditing ? (
        <button
          className="popover-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCommentClick}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 8h10" />
            <path d="M7 12h6" />
            <path d="M5 4h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H9l-6 3V7a3 3 0 0 1 3-3Z" />
          </svg>
          Comment
        </button>
      ) : (
        <div className="comment-form">
          <div
            className="comment-form-content"
            style={formMaxHeight ? { maxHeight: formMaxHeight, overflowY: 'auto' } : undefined}
          >
            <textarea
              ref={inputRef}
              className="comment-input"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
          </div>
          <div className="comment-actions">
            <button className="comment-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <div className="comment-submit-wrapper">
              <button className="comment-submit" onClick={handleSubmit} disabled={!comment.trim()}>
                Submit
              </button>
              <div role="tooltip" className="shortcut-tooltip">
                <kbd className="shortcut-key">{isMac ? '⌘' : 'Ctrl'}</kbd>
                <kbd className="shortcut-key">Enter</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
