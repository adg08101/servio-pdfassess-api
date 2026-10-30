import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { DocumentVersionStatus } from '../domain/document.enums';

export interface DocumentVersion {
  documentId: Types.ObjectId;
  version: number;
  storageKey: string;
  checksumSha256: string;
  mimeType: 'application/pdf';
  fileSizeBytes: number;
  pageCount: number;
  pageDimensions: Array<{ pageNumber: number; width: number; height: number }>;
  status: DocumentVersionStatus;
  importedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentVersionSchema = new Schema<DocumentVersion>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'documents', required: true, index: true },
    version: { type: Number, required: true },
    storageKey: { type: String, required: true, unique: true },
    checksumSha256: { type: String, required: true, index: true },
    mimeType: { type: String, required: true, enum: ['application/pdf'] },
    fileSizeBytes: { type: Number, required: true },
    pageCount: { type: Number, required: true },
    pageDimensions: [
      {
        pageNumber: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        _id: false,
      },
    ],
    status: {
      type: String,
      enum: Object.values(DocumentVersionStatus),
      required: true,
      index: true,
    },
    importedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

documentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });

export type DocumentVersionDocument = HydratedDocument<DocumentVersion>;
export const DocumentVersionModel =
  (models.document_versions as Model<DocumentVersion> | undefined) ??
  model<DocumentVersion>('document_versions', documentVersionSchema);
