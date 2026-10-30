import fs from 'node:fs/promises';
import path from 'node:path';

import { createCanvas, loadImage } from '@napi-rs/canvas';

import { getConfig } from '../../../config/env';
import type { DetectedFieldCandidate } from '../domain/analysis.types';

export class PreviewAnnotatorService {
  public async generateAnnotatedPreview(input: {
    imagePath: string;
    pageNumber: number;
    pageWidth: number;
    pageHeight: number;
    fields: DetectedFieldCandidate[];
    jobId: string;
  }): Promise<string> {
    const config = getConfig();
    await fs.mkdir(config.ANALYSIS_PREVIEW_DIR, { recursive: true });

    const image = await loadImage(input.imagePath);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);

    context.strokeStyle = '#e11d48';
    context.lineWidth = 2;
    context.font = '14px Arial';
    context.fillStyle = '#0f172a';

    for (const field of input.fields) {
      const x = field.normalizedRect.x * input.pageWidth;
      const y = field.normalizedRect.y * input.pageHeight;
      const width = field.normalizedRect.width * input.pageWidth;
      const height = field.normalizedRect.height * input.pageHeight;

      context.strokeRect(x, y, width, height);
      context.fillText(
        `${field.fieldType} (${Math.round(field.confidence * 100)}%)`,
        x,
        Math.max(12, y - 4),
      );
    }

    const outputPath = path.resolve(
      config.ANALYSIS_PREVIEW_DIR,
      `${input.jobId}-page-${input.pageNumber}.png`,
    );
    await fs.writeFile(outputPath, canvas.toBuffer('image/png'));
    return outputPath;
  }
}
