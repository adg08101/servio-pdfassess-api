import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';

import { getConfig } from '../../../config/env';
import { ApiError } from '../../../shared/errors/api-error';

export interface RenderedPdfPage {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  imagePath: string;
  imageBuffer: Buffer;
}

export interface RenderedPdfPagesResult {
  pages: RenderedPdfPage[];
  totalPages: number;
  tempDirectory: string;
  cleanup: () => Promise<void>;
}

interface PdfJsPage {
  rotate: number;
  getViewport(input: { scale: number; rotation?: number }): { width: number; height: number };
  render(input: { canvasContext: unknown; viewport: { width: number; height: number } }): {
    promise: Promise<void>;
  };
}

interface PdfJsDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
}

interface PdfJsModule {
  getDocument(input: { data: Uint8Array; disableWorker: boolean }): {
    promise: Promise<PdfJsDocument>;
  };
}

export class PdfPageRendererService {
  public async renderPages(input: {
    pdfBytes: Buffer;
    pageStart: number;
    pageEnd: number;
    dpi?: number;
  }): Promise<RenderedPdfPagesResult> {
    const config = getConfig();
    const dpi = input.dpi ?? config.ANALYSIS_DEFAULT_DPI;

    if (dpi > config.ANALYSIS_MAX_DPI) {
      throw new ApiError(400, 'DPI_TOO_HIGH', `DPI ${dpi} exceeds max ${config.ANALYSIS_MAX_DPI}`);
    }

    const maxBytes = config.ANALYSIS_MAX_FILE_SIZE_MB * 1024 * 1024;
    if (input.pdfBytes.byteLength > maxBytes) {
      throw new ApiError(413, 'PDF_TOO_LARGE', 'PDF exceeds configured file-size limit');
    }

    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(input.pdfBytes),
      disableWorker: true,
    });

    const document = await loadingTask.promise;
    const pagesRequested = input.pageEnd - input.pageStart + 1;
    if (pagesRequested > config.ANALYSIS_MAX_PAGES_PER_JOB) {
      throw new ApiError(
        400,
        'PAGE_RANGE_TOO_LARGE',
        `Maximum pages per analysis is ${config.ANALYSIS_MAX_PAGES_PER_JOB}`,
      );
    }

    if (
      input.pageStart < 1 ||
      input.pageEnd > document.numPages ||
      input.pageEnd < input.pageStart
    ) {
      throw new ApiError(400, 'INVALID_PAGE_RANGE', 'Requested page range is invalid for this PDF');
    }

    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfassess-analysis-'));
    const scale = dpi / 72;
    const renderedPages: RenderedPdfPage[] = [];

    for (let pageNumber = input.pageStart; pageNumber <= input.pageEnd; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale, rotation: page.rotate });

      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d');
      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const imageBuffer = canvas.toBuffer('image/png');
      const imagePath = path.join(tempDirectory, `page-${pageNumber}.png`);
      await fs.writeFile(imagePath, imageBuffer);

      renderedPages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        rotation: page.rotate,
        imagePath,
        imageBuffer,
      });
    }

    return {
      pages: renderedPages,
      totalPages: document.numPages,
      tempDirectory,
      cleanup: async (): Promise<void> => {
        await fs.rm(tempDirectory, { recursive: true, force: true });
      },
    };
  }
}
