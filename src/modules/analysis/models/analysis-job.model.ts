import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { AnalysisJobStatus } from '../domain/analysis.enums';

export interface AnalysisJob {
  documentRef: string;
  documentId?: Types.ObjectId;
  documentVersionId?: Types.ObjectId;
  fingerprint: string;
  pageStart: number;
  pageEnd: number;
  dpi: number;
  status: AnalysisJobStatus;
  requestedByUserId?: Types.ObjectId;
  errorMessage?: string;
  detectedFieldCount: number;
  reviewRequiredCount: number;
  previewImagePaths: string[];
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const analysisJobSchema = new Schema<AnalysisJob>(
  {
    documentRef: { type: String, required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'documents', index: true },
    documentVersionId: { type: Schema.Types.ObjectId, ref: 'document_versions', index: true },
    fingerprint: { type: String, required: true },
    pageStart: { type: Number, required: true },
    pageEnd: { type: Number, required: true },
    dpi: { type: Number, required: true },
    status: { type: String, enum: Object.values(AnalysisJobStatus), required: true, index: true },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'users' },
    errorMessage: { type: String },
    detectedFieldCount: { type: Number, required: true, default: 0 },
    reviewRequiredCount: { type: Number, required: true, default: 0 },
    previewImagePaths: [{ type: String, required: true }],
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

analysisJobSchema.index({ documentRef: 1, fingerprint: 1 }, { unique: true });

export type AnalysisJobDocument = HydratedDocument<AnalysisJob>;
export const AnalysisJobModel =
  (models.analysis_jobs as Model<AnalysisJob> | undefined) ??
  model<AnalysisJob>('analysis_jobs', analysisJobSchema);
