export interface PdfMetadata {
  pageCount: number;
  pageDimensions: Array<{ pageNumber: number; width: number; height: number }>;
  checksumSha256: string;
  fileSizeBytes: number;
}

export interface PdfInspector {
  inspect(content: Buffer): Promise<PdfMetadata>;
}
