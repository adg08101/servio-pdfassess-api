import type { DetectedFieldType } from './analysis.enums';

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrTextBlock {
  text: string;
  confidence?: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  blocks: OcrTextBlock[];
}

export interface DetectedFieldCandidate {
  fieldIdentifier: string;
  pageNumber: number;
  fieldType: DetectedFieldType;
  label?: string;
  questionText?: string;
  normalizedRect: NormalizedRect;
  confidence: number;
  detectionMethod: string;
  reviewRequired: boolean;
}
