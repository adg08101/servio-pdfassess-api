import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import mongoose from 'mongoose';

import { getConfig } from '../../../config/env';
import { ApiError } from '../../../shared/errors/api-error';
import { DocumentModel } from '../../documents/models/document.model';
import {
  DocumentVersionModel,
  type DocumentVersionDocument,
} from '../../documents/models/document-version.model';
import { AnalysisJobStatus, ReviewStatus } from '../domain/analysis.enums';
import type { DetectedFieldCandidate, OcrPageResult } from '../domain/analysis.types';
import { AnalysisJobModel } from '../models/analysis-job.model';
import { DetectedFieldModel } from '../models/detected-field.model';
import { FieldDetectorService } from './field-detector.service';
import { validatePageRange } from './page-range';
import { PdfPageRendererService } from './pdf-page-renderer.service';
import { PreviewAnnotatorService } from './preview-annotator.service';
import { NoopOcrService } from './ocr/noop-ocr.service';
import type { OcrService } from './ocr/ocr.interface';
import { TesseractCliOcrService } from './ocr/tesseract-cli-ocr.service';

interface ResolvedDocumentSource {
  documentRef: string;
  documentId?: mongoose.Types.ObjectId;
  documentVersionId?: mongoose.Types.ObjectId;
  pdfPath: string;
  pageCountHint?: number;
}

interface AnalyzeInput {
  documentPathId: string;
  pageStart: number;
  pageEnd: number;
  dpi?: number;
  generatePreviews?: boolean;
  requestedByUserId?: string;
}

export class AnalysisService {
  private readonly renderer = new PdfPageRendererService();

  private readonly detector = new FieldDetectorService();

  private readonly previewAnnotator = new PreviewAnnotatorService();

  private readonly ocrService: OcrService;

  public constructor() {
    const config = getConfig();
    this.ocrService =
      config.OCR_ADAPTER === 'noop' ? new NoopOcrService() : new TesseractCliOcrService();
  }

  public async analyze(input: AnalyzeInput): Promise<{
    jobId: string;
    status: AnalysisJobStatus;
    fieldCount: number;
    reviewRequiredCount: number;
    previewImagePaths: string[];
  }> {
    const config = getConfig();
    const resolvedSource = await this.resolveDocumentSource(input.documentPathId);
    const pdfBytes = await fs.readFile(resolvedSource.pdfPath);
    const fingerprint = this.buildFingerprint({
      documentRef: resolvedSource.documentRef,
      pageStart: input.pageStart,
      pageEnd: input.pageEnd,
      dpi: input.dpi ?? config.ANALYSIS_DEFAULT_DPI,
    });

    const job = await AnalysisJobModel.findOneAndUpdate(
      { documentRef: resolvedSource.documentRef, fingerprint },
      {
        documentRef: resolvedSource.documentRef,
        documentId: resolvedSource.documentId,
        documentVersionId: resolvedSource.documentVersionId,
        fingerprint,
        pageStart: input.pageStart,
        pageEnd: input.pageEnd,
        dpi: input.dpi ?? config.ANALYSIS_DEFAULT_DPI,
        requestedByUserId: input.requestedByUserId,
        status: AnalysisJobStatus.PROCESSING,
        errorMessage: undefined,
        startedAt: new Date(),
        previewImagePaths: [],
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    const renderedResult = await this.renderer.renderPages({
      pdfBytes,
      pageStart: input.pageStart,
      pageEnd: input.pageEnd,
      dpi: input.dpi,
    });

    try {
      validatePageRange({
        start: input.pageStart,
        end: input.pageEnd,
        totalPages: renderedResult.totalPages,
        maxPagesPerJob: config.ANALYSIS_MAX_PAGES_PER_JOB,
      });

      const fields: DetectedFieldCandidate[] = [];
      const previewImagePaths: string[] = [];

      for (const page of renderedResult.pages) {
        let ocrPage: OcrPageResult;
        try {
          ocrPage = await this.ocrService.recognizePageImage({
            pageNumber: page.pageNumber,
            imagePath: page.imagePath,
            language: config.OCR_LANGUAGE,
          });
        } catch (error) {
          if (error instanceof ApiError && error.code === 'OCR_UNAVAILABLE') {
            ocrPage = {
              pageNumber: page.pageNumber,
              text: '',
              blocks: [],
            };
          } else {
            throw error;
          }
        }

        const pageFields = this.detector.detectCandidates({
          ocrPage,
          pageWidth: page.width,
          pageHeight: page.height,
        });

        const imageFallbackFields = await this.detector.detectBlankLineCandidatesFromImage({
          pageNumber: page.pageNumber,
          imageBuffer: page.imageBuffer,
          pageWidth: page.width,
          pageHeight: page.height,
        });

        fields.push(...pageFields, ...imageFallbackFields);

        if (input.generatePreviews) {
          const previewImagePath = await this.previewAnnotator.generateAnnotatedPreview({
            imagePath: page.imagePath,
            pageNumber: page.pageNumber,
            pageWidth: page.width,
            pageHeight: page.height,
            fields: pageFields,
            jobId: job._id.toString(),
          });
          previewImagePaths.push(previewImagePath);
        }
      }

      await DetectedFieldModel.deleteMany({ analysisJobId: job._id });

      if (fields.length > 0) {
        await DetectedFieldModel.insertMany(
          fields.map((field) => ({
            analysisJobId: job._id,
            documentRef: resolvedSource.documentRef,
            documentId: resolvedSource.documentId,
            fieldIdentifier: field.fieldIdentifier,
            pageNumber: field.pageNumber,
            fieldType: field.fieldType,
            label: field.label,
            questionText: field.questionText,
            normalizedX: field.normalizedRect.x,
            normalizedY: field.normalizedRect.y,
            normalizedWidth: field.normalizedRect.width,
            normalizedHeight: field.normalizedRect.height,
            confidence: field.confidence,
            detectionMethod: field.detectionMethod,
            reviewRequired: field.reviewRequired,
            reviewStatus: ReviewStatus.PENDING_REVIEW,
          })),
        );
      }

      const reviewRequiredCount = fields.filter((field) => field.reviewRequired).length;
      await AnalysisJobModel.updateOne(
        { _id: job._id },
        {
          status: AnalysisJobStatus.COMPLETED,
          finishedAt: new Date(),
          detectedFieldCount: fields.length,
          reviewRequiredCount,
          previewImagePaths,
        },
      );

      return {
        jobId: job._id.toString(),
        status: AnalysisJobStatus.COMPLETED,
        fieldCount: fields.length,
        reviewRequiredCount,
        previewImagePaths,
      };
    } catch (error) {
      await AnalysisJobModel.updateOne(
        { _id: job._id },
        {
          status: AnalysisJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown analysis error',
          finishedAt: new Date(),
        },
      );
      throw error;
    } finally {
      await renderedResult.cleanup();
    }
  }

  public async listAnalysis(documentPathId: string) {
    const documentRef = await this.resolveDocumentRef(documentPathId);
    return AnalysisJobModel.find({ documentRef }).sort({ updatedAt: -1 }).lean();
  }

  public async listFields(input: { documentPathId: string; pageStart?: number; pageEnd?: number }) {
    const documentRef = await this.resolveDocumentRef(input.documentPathId);
    const query: Record<string, unknown> = { documentRef };

    if (input.pageStart || input.pageEnd) {
      query.pageNumber = {};
      if (input.pageStart) {
        (query.pageNumber as Record<string, number>).$gte = input.pageStart;
      }
      if (input.pageEnd) {
        (query.pageNumber as Record<string, number>).$lte = input.pageEnd;
      }
    }

    return DetectedFieldModel.find(query).sort({ pageNumber: 1, createdAt: 1 }).lean();
  }

  public async updateField(input: {
    documentPathId: string;
    fieldId: string;
    patch: {
      label?: string;
      fieldType?: string;
      reviewRequired?: boolean;
      reviewStatus?: ReviewStatus;
      normalizedX?: number;
      normalizedY?: number;
      normalizedWidth?: number;
      normalizedHeight?: number;
    };
  }) {
    const documentRef = await this.resolveDocumentRef(input.documentPathId);
    const field = await DetectedFieldModel.findOneAndUpdate(
      { _id: input.fieldId, documentRef },
      input.patch,
      { new: true },
    );

    if (!field) {
      throw new ApiError(404, 'FIELD_NOT_FOUND', 'Detected field not found for this document');
    }

    return field;
  }

  private async resolveDocumentSource(documentPathId: string): Promise<ResolvedDocumentSource> {
    const config = getConfig();

    if (documentPathId === 'sample') {
      const sampleAbsolutePath = path.resolve(config.SAMPLE_PDF_PATH);
      try {
        await fs.access(sampleAbsolutePath);
      } catch {
        throw new ApiError(
          404,
          'SAMPLE_PDF_NOT_FOUND',
          `Sample PDF not found at ${sampleAbsolutePath}`,
        );
      }

      return {
        documentRef: 'sample',
        pdfPath: sampleAbsolutePath,
      };
    }

    if (!mongoose.isValidObjectId(documentPathId)) {
      throw new ApiError(400, 'INVALID_DOCUMENT_ID', 'Invalid document identifier');
    }

    const document = await DocumentModel.findById(documentPathId);
    if (!document) {
      throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
    }

    const documentVersion = (await DocumentVersionModel.findById(
      document.latestVersionId,
    )) as DocumentVersionDocument | null;
    if (!documentVersion) {
      throw new ApiError(404, 'DOCUMENT_VERSION_NOT_FOUND', 'Latest document version not found');
    }

    const pdfPath = path.isAbsolute(documentVersion.storageKey)
      ? documentVersion.storageKey
      : path.resolve(documentVersion.storageKey);

    try {
      await fs.access(pdfPath);
    } catch {
      throw new ApiError(
        404,
        'PDF_STORAGE_NOT_FOUND',
        `Configured PDF storage path is unavailable: ${pdfPath}`,
      );
    }

    return {
      documentRef: document._id.toString(),
      documentId: document._id,
      documentVersionId: documentVersion._id,
      pdfPath,
      pageCountHint: documentVersion.pageCount,
    };
  }

  private async resolveDocumentRef(documentPathId: string): Promise<string> {
    if (documentPathId === 'sample') {
      return 'sample';
    }

    if (!mongoose.isValidObjectId(documentPathId)) {
      throw new ApiError(400, 'INVALID_DOCUMENT_ID', 'Invalid document identifier');
    }

    return documentPathId;
  }

  private buildFingerprint(input: {
    documentRef: string;
    pageStart: number;
    pageEnd: number;
    dpi: number;
  }): string {
    const payload = `${input.documentRef}|${input.pageStart}|${input.pageEnd}|${input.dpi}|v1`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
