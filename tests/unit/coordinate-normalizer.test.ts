import { describe, expect, it } from 'vitest';

import { normalizeRect } from '../../src/modules/analysis/services/coordinate-normalizer';

describe('normalizeRect', () => {
  it('normalizes coordinates to [0,1] range using top-left origin', () => {
    const rect = normalizeRect({
      x: 100,
      y: 200,
      width: 50,
      height: 40,
      pageWidth: 400,
      pageHeight: 800,
    });

    expect(rect).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.125,
      height: 0.05,
    });
  });

  it('clamps out-of-bound values', () => {
    const rect = normalizeRect({
      x: -100,
      y: 900,
      width: 800,
      height: 999,
      pageWidth: 400,
      pageHeight: 800,
    });

    expect(rect.x).toBe(0);
    expect(rect.y).toBe(1);
    expect(rect.width).toBe(1);
    expect(rect.height).toBe(1);
  });
});
