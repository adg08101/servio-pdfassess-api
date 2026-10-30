import type { FastifyInstance } from 'fastify';

import { mongoHealth } from '../../infrastructure/database/mongoose';
import { ok } from '../../shared/http/response';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  service: { type: 'string' },
                  uptimeSeconds: { type: 'number' },
                  mongo: {
                    type: 'object',
                    properties: {
                      state: { type: 'string' },
                      readyState: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return ok(reply, {
        status: 'ok',
        service: 'pdfassess-api',
        uptimeSeconds: process.uptime(),
        mongo: mongoHealth(),
      });
    },
  );
}
