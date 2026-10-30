import type { FastifyInstance } from 'fastify';

import { registerAuthRoutes } from '../modules/auth/auth.routes';
import { registerDocumentsRoutes } from '../modules/documents/documents.routes';
import { registerHealthRoutes } from '../modules/health/health.route';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async (apiV1) => {
      await registerHealthRoutes(apiV1);
      await registerAuthRoutes(apiV1);
      await registerDocumentsRoutes(apiV1);
    },
    { prefix: '/api/v1' },
  );
}
