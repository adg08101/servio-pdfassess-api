import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import { Types } from 'mongoose';

import { getConfig } from '../config/env';
import { connectMongo, disconnectMongo } from '../infrastructure/database/mongoose';
import { DocumentSource, DocumentVersionStatus } from '../modules/documents/domain/document.enums';
import { DocumentModel } from '../modules/documents/models/document.model';
import { DocumentVersionModel } from '../modules/documents/models/document-version.model';
import { UserRole } from '../modules/auth/domain/user-role';
import { UserModel } from '../modules/auth/models/user.model';

async function main(): Promise<void> {
  const config = getConfig();
  await connectMongo();

  const samplePath = path.resolve(config.SAMPLE_PDF_PATH);
  const bytes = await fs.readFile(samplePath);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });

  const pageDimensions = pdf.getPages().map((page, index) => ({
    pageNumber: index + 1,
    width: page.getWidth(),
    height: page.getHeight(),
  }));

  const adminUser = await UserModel.findOne({ role: UserRole.ADMIN });
  if (!adminUser) {
    throw new Error('Admin user not found. Run `npm run seed` first.');
  }

  const checksumSha256 = crypto.createHash('sha256').update(bytes).digest('hex');

  let document = await DocumentModel.findOne({ title: 'Level II Workbook (Sample)' });
  if (!document) {
    document = await DocumentModel.create({
      ownerUserId: adminUser._id,
      title: 'Level II Workbook (Sample)',
      source: DocumentSource.UPLOAD,
      latestVersionId: new Types.ObjectId(),
    });
  }

  const existingVersion = await DocumentVersionModel.findOne({
    documentId: document._id,
    version: 1,
  });
  const documentVersion =
    existingVersion ??
    (await DocumentVersionModel.create({
      documentId: document._id,
      version: 1,
      storageKey: samplePath,
      checksumSha256,
      mimeType: 'application/pdf',
      fileSizeBytes: bytes.byteLength,
      pageCount: pdf.getPageCount(),
      pageDimensions,
      status: DocumentVersionStatus.ACTIVE,
      importedAt: new Date(),
    }));

  document.latestVersionId = documentVersion._id;
  await document.save();

  console.log('Sample document registered successfully.');
  console.log(`Document ID: ${document._id.toString()}`);
  console.log(`Version ID: ${documentVersion._id.toString()}`);

  await disconnectMongo();
}

void main();
