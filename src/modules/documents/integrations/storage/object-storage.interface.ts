export interface ObjectStorageUploadResult {
  key: string;
  size: number;
}

export interface ObjectStorage {
  putPrivatePdf(input: {
    keyHint: string;
    content: Buffer;
    mimeType: string;
  }): Promise<ObjectStorageUploadResult>;
  getSignedReadUrl(input: { key: string; expiresInSeconds: number }): Promise<string>;
}
