import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Types } from 'mongoose';

import { buildApp } from '../../src/app';
import { resetConfigCache } from '../../src/config/env';
import { UserRole } from '../../src/modules/auth/domain/user-role';
import { UserStatus } from '../../src/modules/auth/domain/user-status';
import { UserModel } from '../../src/modules/auth/models/user.model';
import { PasswordService } from '../../src/modules/auth/services/password.service';
import {
  DocumentSource,
  DocumentVersionStatus,
} from '../../src/modules/documents/domain/document.enums';
import { DocumentModel } from '../../src/modules/documents/models/document.model';
import { DocumentVersionModel } from '../../src/modules/documents/models/document-version.model';
import { stopMongoMemoryServer, startMongoMemoryServer } from '../helpers/mongo-memory';
import { cleanupSyntheticPdfFile, createSyntheticPdfFile } from '../helpers/pdf-fixtures';

describe('Analysis API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let cookieHeader: string;
  let documentId: string;
  let syntheticPdfPath: string;

  beforeAll(async () => {
    process.env.OCR_ADAPTER = 'noop';
    process.env.MONGODB_URI = await startMongoMemoryServer();
    resetConfigCache();

    syntheticPdfPath = await createSyntheticPdfFile(4);

    app = await buildApp();
    await app.ready();

    const passwordService = new PasswordService();
    const adminPasswordHash = await passwordService.hash('AdminPassword123!');
    const adminUser = await UserModel.create({
      email: 'admin.analysis@example.com',
      fullName: 'Analysis Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin.analysis@example.com',
        password: 'AdminPassword123!',
      },
    });

    cookieHeader = Array.isArray(loginResponse.headers['set-cookie'])
      ? loginResponse.headers['set-cookie'][0]
      : (loginResponse.headers['set-cookie'] as string);

    const versionId = new Types.ObjectId();
    const document = await DocumentModel.create({
      ownerUserId: adminUser._id,
      title: 'Synthetic Workbook',
      source: DocumentSource.UPLOAD,
      latestVersionId: versionId,
    });

    await DocumentVersionModel.create({
      _id: versionId,
      documentId: document._id,
      version: 1,
      storageKey: syntheticPdfPath,
      checksumSha256: 'abc123checksum',
      mimeType: 'application/pdf',
      fileSizeBytes: 1000,
      pageCount: 4,
      pageDimensions: [
        { pageNumber: 1, width: 595, height: 842 },
        { pageNumber: 2, width: 595, height: 842 },
        { pageNumber: 3, width: 595, height: 842 },
        { pageNumber: 4, width: 595, height: 842 },
      ],
      status: DocumentVersionStatus.ACTIVE,
      importedAt: new Date(),
    });

    documentId = document._id.toString();
  });

  afterAll(async () => {
    await app.close();
    await cleanupSyntheticPdfFile(syntheticPdfPath);
    await stopMongoMemoryServer();
  });

  it('analyzes a bounded page range and lists jobs/fields', async () => {
    const analyzeResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${documentId}/analyze`,
      headers: { cookie: cookieHeader },
      payload: {
        pageStart: 2,
        pageEnd: 3,
        dpi: 120,
        generatePreviews: false,
      },
    });

    expect(analyzeResponse.statusCode).toBe(202);
    expect(analyzeResponse.json().data.status).toBe('COMPLETED');

    const listAnalysisResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/documents/${documentId}/analysis`,
      headers: { cookie: cookieHeader },
    });

    expect(listAnalysisResponse.statusCode).toBe(200);
    expect(listAnalysisResponse.json().data.jobs.length).toBe(1);

    const listFieldsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/documents/${documentId}/fields?pageStart=2&pageEnd=3`,
      headers: { cookie: cookieHeader },
    });

    expect(listFieldsResponse.statusCode).toBe(200);
    expect(Array.isArray(listFieldsResponse.json().data.fields)).toBe(true);
  });

  it('reuses the same fingerprint job on repeated request', async () => {
    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${documentId}/analyze`,
      headers: { cookie: cookieHeader },
      payload: {
        pageStart: 2,
        pageEnd: 3,
        dpi: 120,
      },
    });

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${documentId}/analyze`,
      headers: { cookie: cookieHeader },
      payload: {
        pageStart: 2,
        pageEnd: 3,
        dpi: 120,
      },
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);
    expect(first.json().data.jobId).toBe(second.json().data.jobId);
  });

  it('returns validation error for oversized page range', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${documentId}/analyze`,
      headers: { cookie: cookieHeader },
      payload: {
        pageStart: 1,
        pageEnd: 50,
      },
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('fails when pdf storage path is unavailable', async () => {
    const versionId = new Types.ObjectId();
    const missingDocument = await DocumentModel.create({
      ownerUserId: new Types.ObjectId(),
      title: 'Broken Storage PDF',
      source: DocumentSource.UPLOAD,
      latestVersionId: versionId,
    });

    await DocumentVersionModel.create({
      _id: versionId,
      documentId: missingDocument._id,
      version: 1,
      storageKey: './missing/path/not-found.pdf',
      checksumSha256: 'missing-checksum',
      mimeType: 'application/pdf',
      fileSizeBytes: 100,
      pageCount: 1,
      pageDimensions: [{ pageNumber: 1, width: 595, height: 842 }],
      status: DocumentVersionStatus.ACTIVE,
      importedAt: new Date(),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${missingDocument._id.toString()}/analyze`,
      headers: { cookie: cookieHeader },
      payload: {
        pageStart: 1,
        pageEnd: 1,
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
