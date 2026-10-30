import type { OcrPageResult } from '../../domain/analysis.types';
import type { OcrService } from './ocr.interface';

export class NoopOcrService implements OcrService {
  public async recognizePageImage(input: {
    pageNumber: number;
    imagePath: string;
    language: string;
  }): Promise<OcrPageResult> {
    return {
      pageNumber: input.pageNumber,
      text: '',
      blocks: [],
    };
  }
}
