import { z } from 'zod';

import { DetectedFieldType, ReviewStatus } from '../domain/analysis.enums';

export const analyzeDocumentBodySchema = z.object({
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  dpi: z.number().int().positive().optional(),
  generatePreviews: z.boolean().optional().default(false),
});

export const listFieldsQuerySchema = z.object({
  pageStart: z.coerce.number().int().positive().optional(),
  pageEnd: z.coerce.number().int().positive().optional(),
});

export const patchFieldBodySchema = z
  .object({
    label: z.string().max(500).optional(),
    fieldType: z.nativeEnum(DetectedFieldType).optional(),
    reviewRequired: z.boolean().optional(),
    reviewStatus: z.nativeEnum(ReviewStatus).optional(),
    normalizedX: z.number().min(0).max(1).optional(),
    normalizedY: z.number().min(0).max(1).optional(),
    normalizedWidth: z.number().min(0).max(1).optional(),
    normalizedHeight: z.number().min(0).max(1).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field property must be provided',
  });
