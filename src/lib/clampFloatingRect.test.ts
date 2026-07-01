import { describe, expect, it } from 'vitest';
import { clampFloatingRect } from './clampFloatingRect';

describe('clampFloatingRect', () => {
  it('keeps a floating layer inside the viewport with padding', () => {
    expect(
      clampFloatingRect({
        left: -20,
        top: 700,
        width: 360,
        height: 180,
        viewportWidth: 800,
        viewportHeight: 720,
        padding: 12,
      }),
    ).toEqual({ left: 12, top: 528 });
  });

  it('keeps oversized floating layers anchored at the viewport padding', () => {
    expect(
      clampFloatingRect({
        left: 80,
        top: 40,
        width: 900,
        height: 760,
        viewportWidth: 800,
        viewportHeight: 720,
        padding: 12,
      }),
    ).toEqual({ left: 12, top: 12 });
  });
});
