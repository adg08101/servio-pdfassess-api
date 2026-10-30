import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export async function registerDocsPlugins(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'PDFAssess API',
        version: '1.0.0',
        description: 'Backend API for PDFAssess',
      },
      tags: [
        { name: 'health', description: 'Health checks' },
        { name: 'auth', description: 'Authentication and sessions' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
}
