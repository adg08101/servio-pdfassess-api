import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { DocumentSource } from '../domain/document.enums';

export interface Document {
  ownerUserId: Types.ObjectId;
  title: string;
  source: DocumentSource;
  latestVersionId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<Document>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    title: { type: String, required: true, trim: true },
    source: { type: String, enum: Object.values(DocumentSource), required: true },
    latestVersionId: { type: Schema.Types.ObjectId, ref: 'document_versions', required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type DocumentDocument = HydratedDocument<Document>;
export const DocumentModel =
  (models.documents as Model<Document> | undefined) ?? model<Document>('documents', documentSchema);
