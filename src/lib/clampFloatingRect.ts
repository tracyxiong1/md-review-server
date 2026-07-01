interface ClampFloatingRectInput {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampFloatingRect({
  left,
  top,
  width,
  height,
  viewportWidth,
  viewportHeight,
  padding = 12,
}: ClampFloatingRectInput) {
  const maxLeft = Math.max(padding, viewportWidth - width - padding);
  const maxTop = Math.max(padding, viewportHeight - height - padding);

  return {
    left: Math.round(clamp(left, padding, maxLeft)),
    top: Math.round(clamp(top, padding, maxTop)),
  };
}
