import type { FastifyInstance } from 'fastify';

import { ApiError } from '../../shared/errors/api-error';
import { ok } from '../../shared/http/response';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { UserRole } from '../auth/domain/user-role';
import { extractGoogleDriveFileId } from './integrations/drive/drive-url';

export async function registerDocumentsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/documents/import/google-drive',
    {
      preHandler: [requireAuth, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['documents'],
      },
    },
    async (request, reply) => {
      const body = request.body as { driveUrl?: string };
      if (!body?.driveUrl) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'driveUrl is required');
      }

      const fileId = extractGoogleDriveFileId(body.driveUrl);
      return ok(reply, {
        accepted: true,
        fileId,
        message:
          'Import architecture is configured. External Drive download + object storage adapter wiring is required per environment.',
      });
    },
  );
}
