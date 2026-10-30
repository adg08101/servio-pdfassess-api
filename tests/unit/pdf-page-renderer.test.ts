import fs from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { PdfPageRendererService } from '../../src/modules/analysis/services/pdf-page-renderer.service';
import { cleanupSyntheticPdfFile, createSyntheticPdfFile } from '../helpers/pdf-fixtures';

describe('PdfPageRendererService', () => {
  const renderer = new PdfPageRendererService();
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    for (const pdfPath of cleanupPaths) {
      await cleanupSyntheticPdfFile(pdfPath);
    }
    cleanupPaths.length = 0;
  });

  it('renders selected pages only', async () => {
    const pdfPath = await createSyntheticPdfFile(4);
    cleanupPaths.push(pdfPath);
    const bytes = await fs.readFile(pdfPath);

    const result = await renderer.renderPages({
      pdfBytes: bytes,
      pageStart: 2,
      pageEnd: 3,
      dpi: 110,
    });

    expect(result.totalPages).toBe(4);
    expect(result.pages.length).toBe(2);
    expect(result.pages[0].pageNumber).toBe(2);
    expect(result.pages[1].pageNumber).toBe(3);
    expect(result.pages[0].imageBuffer.byteLength).toBeGreaterThan(1000);

    await result.cleanup();
  });

  it('rejects invalid page ranges', async () => {
    const pdfPath = await createSyntheticPdfFile(2);
    cleanupPaths.push(pdfPath);
    const bytes = await fs.readFile(pdfPath);

    await expect(
      renderer.renderPages({
        pdfBytes: bytes,
        pageStart: 1,
        pageEnd: 10,
      }),
    ).rejects.toThrowError();
  });

  it('fails on invalid pdf bytes', async () => {
    await expect(
      renderer.renderPages({
        pdfBytes: Buffer.from('not-a-pdf'),
        pageStart: 1,
        pageEnd: 1,
      }),
    ).rejects.toThrowError();
  });
});
