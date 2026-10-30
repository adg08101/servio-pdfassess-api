import type { OcrPageResult } from '../../domain/analysis.types';

export interface OcrService {
  recognizePageImage(input: {
    pageNumber: number;
    imagePath: string;
    language: string;
  }): Promise<OcrPageResult>;
}
