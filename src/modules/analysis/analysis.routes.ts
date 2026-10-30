import type { FastifyInstance } from 'fastify';

import { ok } from '../../shared/http/response';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { UserRole } from '../auth/domain/user-role';
import {
  analyzeDocumentBodySchema,
  listFieldsQuerySchema,
  patchFieldBodySchema,
} from './schemas/analysis.schemas';
import { AnalysisService } from './services/analysis.service';

const analysisService = new AnalysisService();

export async function registerAnalysisRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/documents/:id/analyze',
    {
      preHandler: [requireAuth, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['analysis'],
        summary: 'Analyze document pages and detect interactive answer regions',
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = analyzeDocumentBodySchema.parse(request.body);

      const result = await analysisService.analyze({
        documentPathId: params.id,
        pageStart: body.pageStart,
        pageEnd: body.pageEnd,
        dpi: body.dpi,
        generatePreviews: body.generatePreviews,
        requestedByUserId: request.authUser?._id.toString(),
      });

      return ok(reply, result, 202);
    },
  );

  app.get(
    '/documents/:id/analysis',
    {
      preHandler: [requireAuth, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['analysis'],
        summary: 'Get analysis jobs for a document',
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const jobs = await analysisService.listAnalysis(params.id);
      return ok(reply, { jobs });
    },
  );

  app.get(
    '/documents/:id/fields',
    {
      preHandler: [requireAuth, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['analysis'],
        summary: 'Get detected fields for a document',
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const query = listFieldsQuerySchema.parse(request.query);
      const fields = await analysisService.listFields({
        documentPathId: params.id,
        pageStart: query.pageStart,
        pageEnd: query.pageEnd,
      });
      return ok(reply, { fields });
    },
  );

  app.patch(
    '/documents/:id/fields/:fieldId',
    {
      preHandler: [requireAuth, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['analysis'],
        summary: 'Patch a detected field after admin review',
      },
    },
    async (request, reply) => {
      const params = request.params as { id: string; fieldId: string };
      const body = patchFieldBodySchema.parse(request.body);
      const updatedField = await analysisService.updateField({
        documentPathId: params.id,
        fieldId: params.fieldId,
        patch: body,
      });
      return ok(reply, { field: updatedField });
    },
  );
}
