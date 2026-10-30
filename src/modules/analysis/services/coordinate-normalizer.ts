import type { NormalizedRect } from '../domain/analysis.types';

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export function normalizeRect(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}): NormalizedRect {
  const { x, y, width, height, pageWidth, pageHeight } = input;

  const normalizedX = clamp01(x / pageWidth);
  const normalizedY = clamp01(y / pageHeight);
  const normalizedWidth = clamp01(width / pageWidth);
  const normalizedHeight = clamp01(height / pageHeight);

  return {
    x: normalizedX,
    y: normalizedY,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}
