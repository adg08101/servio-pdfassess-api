import crypto from 'node:crypto';

import { PDFDocument } from 'pdf-lib';

import { ApiError } from '../../../shared/errors/api-error';
import { DocumentVersionStatus } from '../domain/document.enums';
import type { DriveClient } from '../integrations/drive/drive-client.interface';
import { extractGoogleDriveFileId } from '../integrations/drive/drive-url';
import type { ObjectStorage } from '../integrations/storage/object-storage.interface';

interface ImportDocumentDependencies {
  driveClient: DriveClient;
  storage: ObjectStorage;
}

export class DocumentImportService {
  public constructor(private readonly deps: ImportDocumentDependencies) {}

  public async importFromPublicDrive(input: { driveUrl: string }): Promise<{
    sourceFileId: string;
    fileName: string;
    storageKey: string;
    checksumSha256: string;
    pageCount: number;
    status: DocumentVersionStatus;
  }> {
    const fileId = extractGoogleDriveFileId(input.driveUrl);
    const file = await this.deps.driveClient.downloadPublicPdf(fileId);

    if (file.mimeType !== 'application/pdf') {
      throw new ApiError(415, 'UNSUPPORTED_MIME', 'Only PDF files are supported');
    }

    const pdf = await this.tryLoadPdf(file.content);
    const checksumSha256 = crypto.createHash('sha256').update(file.content).digest('hex');

    const upload = await this.deps.storage.putPrivatePdf({
      keyHint: `${fileId}-${Date.now()}`,
      content: file.content,
      mimeType: file.mimeType,
    });

    return {
      sourceFileId: fileId,
      fileName: file.filename,
      storageKey: upload.key,
      checksumSha256,
      pageCount: pdf.getPageCount(),
      status: DocumentVersionStatus.ACTIVE,
    };
  }

  private async tryLoadPdf(content: Buffer): Promise<PDFDocument> {
    try {
      return await PDFDocument.load(content, { updateMetadata: false });
    } catch {
      throw new ApiError(422, 'INVALID_PDF', 'The imported file is not a valid PDF document');
    }
  }
}
