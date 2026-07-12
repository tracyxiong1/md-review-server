import { describe, expect, it } from 'vitest';
import { clampScale, fitScale, zoomAtPoint } from './diagramViewport';

describe('diagramViewport', () => {
  it('clamps scale to the supported 25% to 400% range', () => {
    expect(clampScale(0.1)).toBe(0.25);
    expect(clampScale(2)).toBe(2);
    expect(clampScale(5)).toBe(4);
  });

  it('fits the complete diagram inside the available viewport', () => {
    expect(fitScale({ width: 1600, height: 800 }, { width: 800, height: 600 })).toBe(0.5);
  });

  it('falls back to 100% for dimensions that cannot be measured', () => {
    expect(fitScale({ width: 0, height: 0 }, { width: 800, height: 600 })).toBe(1);
  });

  it('keeps the diagram point below the pointer fixed while zooming', () => {
    expect(zoomAtPoint({ scale: 1, x: 0, y: 0 }, 2, { x: 300, y: 200 }, { x: 100, y: 50 })).toEqual(
      { scale: 2, x: -200, y: -150 },
    );
  });
});
