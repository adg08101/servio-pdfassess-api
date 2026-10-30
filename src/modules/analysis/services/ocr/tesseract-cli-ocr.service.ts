import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { getConfig } from '../../../../config/env';
import { ApiError } from '../../../../shared/errors/api-error';
import type { OcrPageResult, OcrTextBlock } from '../../domain/analysis.types';
import type { OcrService } from './ocr.interface';

const execFileAsync = promisify(execFile);

interface TsvRow {
  text: string;
  confidence: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export function parseTesseractTsv(tsv: string): TsvRow[] {
  const lines = tsv.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return [];
  }

  const rows: TsvRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const columns = lines[index].split('\t');
    if (columns.length < 12) {
      continue;
    }

    const text = columns[11].trim();
    if (!text) {
      continue;
    }

    const confidence = Number(columns[10]);
    const left = Number(columns[6]);
    const top = Number(columns[7]);
    const width = Number(columns[8]);
    const height = Number(columns[9]);

    if ([confidence, left, top, width, height].some((value) => Number.isNaN(value))) {
      continue;
    }

    rows.push({ text, confidence, left, top, width, height });
  }

  return rows;
}

export class TesseractCliOcrService implements OcrService {
  public async recognizePageImage(input: {
    pageNumber: number;
    imagePath: string;
    language: string;
  }): Promise<OcrPageResult> {
    const config = getConfig();

    try {
      const { stdout } = await execFileAsync(config.OCR_TESSERACT_BIN, [
        input.imagePath,
        'stdout',
        '-l',
        input.language,
        'tsv',
      ]);

      const rows = parseTesseractTsv(stdout);
      const blocks: OcrTextBlock[] = rows.map((row) => ({
        text: row.text,
        confidence: row.confidence / 100,
        bbox: {
          x: row.left,
          y: row.top,
          width: row.width,
          height: row.height,
        },
      }));

      return {
        pageNumber: input.pageNumber,
        text: blocks.map((item) => item.text).join(' '),
        blocks,
      };
    } catch (error) {
      throw new ApiError(
        422,
        'OCR_UNAVAILABLE',
        'Tesseract OCR CLI is unavailable or failed. Install Tesseract and ensure it is in PATH.',
        error,
      );
    }
  }
}
