import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function createSyntheticPdfFile(pageCount = 3): Promise<string> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`Worksheet Page ${pageIndex + 1}`, {
      x: 60,
      y: 780,
      size: 16,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText('1) Complete: The sun ____ in the east.', {
      x: 60,
      y: 730,
      size: 12,
      font,
    });

    page.drawText('2) True / False', {
      x: 60,
      y: 700,
      size: 12,
      font,
    });

    page.drawText('A) Option one', {
      x: 60,
      y: 670,
      size: 12,
      font,
    });

    page.drawText('B) Option two', {
      x: 60,
      y: 645,
      size: 12,
      font,
    });
  }

  const bytes = await pdf.save();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfassess-fixture-'));
  const pdfPath = path.join(directory, 'fixture.pdf');
  await fs.writeFile(pdfPath, Buffer.from(bytes));
  return pdfPath;
}

export async function cleanupSyntheticPdfFile(pdfPath: string): Promise<void> {
  const directory = path.dirname(pdfPath);
  await fs.rm(directory, { recursive: true, force: true });
}
