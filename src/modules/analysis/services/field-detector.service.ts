import crypto from 'node:crypto';

import { createCanvas, loadImage } from '@napi-rs/canvas';

import { DetectedFieldType } from '../domain/analysis.enums';
import type { DetectedFieldCandidate, OcrPageResult } from '../domain/analysis.types';
import { normalizeRect } from './coordinate-normalizer';

function buildFieldIdentifier(input: {
  pageNumber: number;
  fieldType: DetectedFieldType;
  x: number;
  y: number;
  width: number;
  height: number;
}): string {
  const payload = `${input.pageNumber}|${input.fieldType}|${input.x}|${input.y}|${input.width}|${input.height}`;
  return crypto.createHash('sha1').update(payload).digest('hex');
}

function confidenceWithBounds(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Number(value.toFixed(4));
}

export class FieldDetectorService {
  public detectCandidates(input: {
    ocrPage: OcrPageResult;
    pageWidth: number;
    pageHeight: number;
  }): DetectedFieldCandidate[] {
    const result: DetectedFieldCandidate[] = [];
    const { ocrPage, pageWidth, pageHeight } = input;

    let optionLikeCount = 0;
    let checkboxCount = 0;

    for (const block of ocrPage.blocks) {
      const text = block.text;
      const rect = normalizeRect({
        x: block.bbox.x,
        y: block.bbox.y,
        width: block.bbox.width,
        height: block.bbox.height,
        pageWidth,
        pageHeight,
      });

      const isBlankPattern = /_{3,}|\.{3,}/.test(text);
      const isCheckboxPattern = /[☐□✓✔]/.test(text);
      const isOptionPattern = /^\(?[A-Da-d1-5]\)|^[A-Da-d1-5][\).]/.test(text);
      const hasTrueFalsePattern = /\btrue\b|\bfalse\b|\bT\/F\b/i.test(text);
      const hasMultiChoiceHint = /choose all|select all|mark all/i.test(text);

      if (isBlankPattern) {
        const fieldType =
          rect.width > 0.45 ? DetectedFieldType.TEXTAREA : DetectedFieldType.TEXT_INPUT;
        const confidence = confidenceWithBounds(0.55 + (block.confidence ?? 0.5) * 0.35);

        result.push({
          fieldIdentifier: buildFieldIdentifier({
            pageNumber: ocrPage.pageNumber,
            fieldType,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }),
          pageNumber: ocrPage.pageNumber,
          fieldType,
          label: undefined,
          questionText: text,
          normalizedRect: rect,
          confidence,
          detectionMethod: 'ocr-blank-pattern',
          reviewRequired: confidence < 0.85,
        });
      }

      if (isCheckboxPattern) {
        checkboxCount += 1;
        const confidence = confidenceWithBounds(0.5 + (block.confidence ?? 0.5) * 0.35);
        result.push({
          fieldIdentifier: buildFieldIdentifier({
            pageNumber: ocrPage.pageNumber,
            fieldType: DetectedFieldType.CHECKBOX,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }),
          pageNumber: ocrPage.pageNumber,
          fieldType: DetectedFieldType.CHECKBOX,
          questionText: text,
          normalizedRect: rect,
          confidence,
          detectionMethod: 'ocr-checkbox-symbol',
          reviewRequired: confidence < 0.8,
        });
      }

      if (isOptionPattern) {
        optionLikeCount += 1;
        const confidence = confidenceWithBounds(0.45 + (block.confidence ?? 0.4) * 0.4);
        result.push({
          fieldIdentifier: buildFieldIdentifier({
            pageNumber: ocrPage.pageNumber,
            fieldType: DetectedFieldType.RADIO,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }),
          pageNumber: ocrPage.pageNumber,
          fieldType: DetectedFieldType.RADIO,
          questionText: text,
          normalizedRect: rect,
          confidence,
          detectionMethod: 'ocr-option-marker',
          reviewRequired: true,
        });
      }

      if (hasTrueFalsePattern) {
        const confidence = confidenceWithBounds(0.5 + (block.confidence ?? 0.4) * 0.4);
        result.push({
          fieldIdentifier: buildFieldIdentifier({
            pageNumber: ocrPage.pageNumber,
            fieldType: DetectedFieldType.TRUE_FALSE,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }),
          pageNumber: ocrPage.pageNumber,
          fieldType: DetectedFieldType.TRUE_FALSE,
          questionText: text,
          normalizedRect: rect,
          confidence,
          detectionMethod: 'ocr-true-false-keyword',
          reviewRequired: true,
        });
      }

      if (hasMultiChoiceHint) {
        const confidence = confidenceWithBounds(0.6 + (block.confidence ?? 0.5) * 0.25);
        result.push({
          fieldIdentifier: buildFieldIdentifier({
            pageNumber: ocrPage.pageNumber,
            fieldType: DetectedFieldType.MULTIPLE_CHOICE,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }),
          pageNumber: ocrPage.pageNumber,
          fieldType: DetectedFieldType.MULTIPLE_CHOICE,
          questionText: text,
          normalizedRect: rect,
          confidence,
          detectionMethod: 'ocr-multi-choice-hint',
          reviewRequired: confidence < 0.9,
        });
      }
    }

    if (optionLikeCount >= 2) {
      const confidence = confidenceWithBounds(0.55 + Math.min(optionLikeCount, 6) * 0.05);
      result.push({
        fieldIdentifier: buildFieldIdentifier({
          pageNumber: ocrPage.pageNumber,
          fieldType: DetectedFieldType.SINGLE_CHOICE,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        }),
        pageNumber: ocrPage.pageNumber,
        fieldType: DetectedFieldType.SINGLE_CHOICE,
        questionText: `Detected ${optionLikeCount} potential choice markers`,
        normalizedRect: { x: 0, y: 0, width: 1, height: 1 },
        confidence,
        detectionMethod: 'page-level-choice-grouping',
        reviewRequired: true,
      });
    }

    if (checkboxCount >= 2) {
      result.push({
        fieldIdentifier: buildFieldIdentifier({
          pageNumber: ocrPage.pageNumber,
          fieldType: DetectedFieldType.MULTIPLE_CHOICE,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        }),
        pageNumber: ocrPage.pageNumber,
        fieldType: DetectedFieldType.MULTIPLE_CHOICE,
        questionText: `Detected ${checkboxCount} potential checkbox options`,
        normalizedRect: { x: 0, y: 0, width: 1, height: 1 },
        confidence: 0.62,
        detectionMethod: 'page-level-checkbox-grouping',
        reviewRequired: true,
      });
    }

    return result;
  }

  public async detectBlankLineCandidatesFromImage(input: {
    pageNumber: number;
    imageBuffer: Buffer;
    pageWidth: number;
    pageHeight: number;
  }): Promise<DetectedFieldCandidate[]> {
    const image = await loadImage(input.imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, image.width, image.height);

    const candidates: DetectedFieldCandidate[] = [];
    const minLength = Math.floor(image.width * 0.1);
    const yStep = 3;

    for (let y = 0; y < image.height; y += yStep) {
      let segmentStart = -1;
      for (let x = 0; x < image.width; x += 1) {
        const pixelIndex = (y * image.width + x) * 4;
        const red = imageData.data[pixelIndex];
        const green = imageData.data[pixelIndex + 1];
        const blue = imageData.data[pixelIndex + 2];
        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        const isDark = luminance < 80;

        if (isDark && segmentStart < 0) {
          segmentStart = x;
        }

        if ((!isDark || x === image.width - 1) && segmentStart >= 0) {
          const segmentEnd = isDark && x === image.width - 1 ? x : x - 1;
          const segmentWidth = segmentEnd - segmentStart + 1;

          if (segmentWidth >= minLength) {
            const normalizedRect = normalizeRect({
              x: segmentStart,
              y: Math.max(0, y - 1),
              width: segmentWidth,
              height: 4,
              pageWidth: image.width,
              pageHeight: image.height,
            });

            const fieldIdentifier = buildFieldIdentifier({
              pageNumber: input.pageNumber,
              fieldType: DetectedFieldType.TEXT_INPUT,
              x: normalizedRect.x,
              y: normalizedRect.y,
              width: normalizedRect.width,
              height: normalizedRect.height,
            });

            candidates.push({
              fieldIdentifier,
              pageNumber: input.pageNumber,
              fieldType: DetectedFieldType.TEXT_INPUT,
              normalizedRect,
              confidence: 0.35,
              detectionMethod: 'image-horizontal-line-fallback',
              reviewRequired: true,
            });
          }

          segmentStart = -1;
        }
      }
    }

    const dedupedByBand = new Map<string, DetectedFieldCandidate>();
    for (const item of candidates) {
      const bandKey = `${Math.round(item.normalizedRect.y * 300)}:${Math.round(item.normalizedRect.x * 200)}`;
      if (!dedupedByBand.has(bandKey)) {
        dedupedByBand.set(bandKey, item);
      }
      if (dedupedByBand.size >= 200) {
        break;
      }
    }

    return [...dedupedByBand.values()];
  }
}
