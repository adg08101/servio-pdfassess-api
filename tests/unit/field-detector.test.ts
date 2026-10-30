import { describe, expect, it } from 'vitest';

import { DetectedFieldType } from '../../src/modules/analysis/domain/analysis.enums';
import { FieldDetectorService } from '../../src/modules/analysis/services/field-detector.service';

describe('FieldDetectorService', () => {
  const detector = new FieldDetectorService();

  it('detects blank pattern, true/false and options from OCR blocks', () => {
    const candidates = detector.detectCandidates({
      pageWidth: 1200,
      pageHeight: 1600,
      ocrPage: {
        pageNumber: 6,
        text: 'The sun ____ in the east True False A) Option one B) Option two',
        blocks: [
          {
            text: 'The sun ____ in the east',
            confidence: 0.9,
            bbox: { x: 100, y: 150, width: 420, height: 24 },
          },
          {
            text: 'True False',
            confidence: 0.8,
            bbox: { x: 100, y: 210, width: 180, height: 24 },
          },
          {
            text: 'A) Option one',
            confidence: 0.75,
            bbox: { x: 100, y: 270, width: 220, height: 24 },
          },
          {
            text: 'B) Option two',
            confidence: 0.74,
            bbox: { x: 100, y: 300, width: 220, height: 24 },
          },
        ],
      },
    });

    expect(candidates.some((item) => item.fieldType === DetectedFieldType.TEXT_INPUT)).toBe(true);
    expect(candidates.some((item) => item.fieldType === DetectedFieldType.TRUE_FALSE)).toBe(true);
    expect(candidates.some((item) => item.fieldType === DetectedFieldType.RADIO)).toBe(true);
    expect(candidates.some((item) => item.fieldType === DetectedFieldType.SINGLE_CHOICE)).toBe(
      true,
    );
  });
});
