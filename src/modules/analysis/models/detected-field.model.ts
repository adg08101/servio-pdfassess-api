import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { DetectedFieldType, ReviewStatus } from '../domain/analysis.enums';

export interface DetectedField {
  analysisJobId: Types.ObjectId;
  documentRef: string;
  documentId?: Types.ObjectId;
  fieldIdentifier: string;
  pageNumber: number;
  fieldType: DetectedFieldType;
  label?: string;
  questionText?: string;
  normalizedX: number;
  normalizedY: number;
  normalizedWidth: number;
  normalizedHeight: number;
  confidence: number;
  detectionMethod: string;
  reviewRequired: boolean;
  reviewStatus: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

const detectedFieldSchema = new Schema<DetectedField>(
  {
    analysisJobId: {
      type: Schema.Types.ObjectId,
      ref: 'analysis_jobs',
      required: true,
      index: true,
    },
    documentRef: { type: String, required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'documents', index: true },
    fieldIdentifier: { type: String, required: true },
    pageNumber: { type: Number, required: true, index: true },
    fieldType: { type: String, enum: Object.values(DetectedFieldType), required: true },
    label: { type: String },
    questionText: { type: String },
    normalizedX: { type: Number, required: true },
    normalizedY: { type: Number, required: true },
    normalizedWidth: { type: Number, required: true },
    normalizedHeight: { type: Number, required: true },
    confidence: { type: Number, required: true },
    detectionMethod: { type: String, required: true },
    reviewRequired: { type: Boolean, required: true, default: true },
    reviewStatus: {
      type: String,
      enum: Object.values(ReviewStatus),
      required: true,
      default: ReviewStatus.PENDING_REVIEW,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

detectedFieldSchema.index({ analysisJobId: 1, fieldIdentifier: 1 }, { unique: true });
detectedFieldSchema.index({ documentRef: 1, pageNumber: 1 });

export type DetectedFieldDocument = HydratedDocument<DetectedField>;
export const DetectedFieldModel =
  (models.analysis_detected_fields as Model<DetectedField> | undefined) ??
  model<DetectedField>('analysis_detected_fields', detectedFieldSchema);
