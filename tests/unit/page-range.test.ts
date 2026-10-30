import { describe, expect, it } from 'vitest';

import { validatePageRange } from '../../src/modules/analysis/services/page-range';

describe('validatePageRange', () => {
  it('accepts valid bounded range', () => {
    const range = validatePageRange({
      start: 6,
      end: 8,
      totalPages: 124,
      maxPagesPerJob: 5,
    });

    expect(range).toEqual({ start: 6, end: 8 });
  });

  it('rejects oversized range', () => {
    expect(() =>
      validatePageRange({
        start: 1,
        end: 10,
        totalPages: 124,
        maxPagesPerJob: 5,
      }),
    ).toThrowError();
  });

  it('rejects range exceeding total pages', () => {
    expect(() =>
      validatePageRange({
        start: 122,
        end: 126,
        totalPages: 124,
        maxPagesPerJob: 5,
      }),
    ).toThrowError();
  });
});
