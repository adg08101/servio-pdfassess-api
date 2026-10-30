export interface DriveFileDownload {
  fileId: string;
  filename: string;
  mimeType: string;
  content: Buffer;
}

export interface DriveClient {
  downloadPublicPdf(fileId: string): Promise<DriveFileDownload>;
}
