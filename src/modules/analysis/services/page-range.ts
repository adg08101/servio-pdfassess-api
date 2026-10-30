import { ApiError } from '../../../shared/errors/api-error';

export interface PageRange {
  start: number;
  end: number;
}

export function validatePageRange(input: {
  start: number;
  end: number;
  totalPages: number;
  maxPagesPerJob: number;
}): PageRange {
  const { start, end, totalPages, maxPagesPerJob } = input;

  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new ApiError(400, 'INVALID_PAGE_RANGE', 'Page range must use integer page numbers');
  }

  if (start < 1 || end < 1 || end < start) {
    throw new ApiError(400, 'INVALID_PAGE_RANGE', 'Invalid page range boundaries');
  }

  if (end > totalPages) {
    throw new ApiError(
      400,
      'INVALID_PAGE_RANGE',
      `Requested range exceeds total pages (${totalPages})`,
    );
  }

  const requestedPages = end - start + 1;
  if (requestedPages > maxPagesPerJob) {
    throw new ApiError(
      400,
      'PAGE_RANGE_TOO_LARGE',
      `Requested ${requestedPages} pages; max allowed is ${maxPagesPerJob}`,
    );
  }

  return { start, end };
}
