export const MIN_DIAGRAM_SCALE = 0.25;
export const MAX_DIAGRAM_SCALE = 4;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DiagramTransform extends Point {
  scale: number;
}

export const clampScale = (scale: number) =>
  Math.min(MAX_DIAGRAM_SCALE, Math.max(MIN_DIAGRAM_SCALE, scale));

export const fitScale = (diagram: Size, viewport: Size) => {
  if (diagram.width <= 0 || diagram.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return 1;
  }

  return clampScale(Math.min(viewport.width / diagram.width, viewport.height / diagram.height));
};

export const zoomAtPoint = (
  transform: DiagramTransform,
  requestedScale: number,
  pointer: Point,
  viewportOrigin: Point,
): DiagramTransform => {
  const scale = clampScale(requestedScale);
  const localPointer = {
    x: pointer.x - viewportOrigin.x,
    y: pointer.y - viewportOrigin.y,
  };
  const ratio = scale / transform.scale;

  return {
    scale,
    x: localPointer.x - (localPointer.x - transform.x) * ratio,
    y: localPointer.y - (localPointer.y - transform.y) * ratio,
  };
};
