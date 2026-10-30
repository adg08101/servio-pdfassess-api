import { describe, expect, it } from 'vitest';

import { resetConfigCache } from '../../src/config/env';
import {
  TesseractCliOcrService,
  parseTesseractTsv,
} from '../../src/modules/analysis/services/ocr/tesseract-cli-ocr.service';

describe('TesseractCliOcrService', () => {
  it('parses TSV output into OCR rows', () => {
    const tsv = [
      'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
      '5\t1\t1\t1\t1\t1\t100\t200\t50\t20\t95\tHello',
      '5\t1\t1\t1\t1\t2\t160\t200\t55\t20\t90\tWorld',
    ].join('\n');

    const rows = parseTesseractTsv(tsv);
    expect(rows.length).toBe(2);
    expect(rows[0].text).toBe('Hello');
    expect(rows[0].left).toBe(100);
  });

  it('returns OCR_UNAVAILABLE when binary is missing', async () => {
    process.env.OCR_TESSERACT_BIN = 'definitely-missing-tesseract-bin';
    resetConfigCache();

    const service = new TesseractCliOcrService();
    await expect(
      service.recognizePageImage({
        pageNumber: 1,
        imagePath: 'missing-file.png',
        language: 'eng',
      }),
    ).rejects.toThrowError();
  });
});
