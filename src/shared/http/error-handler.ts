import type { FastifyInstance } from 'fastify';

import { ZodError } from 'zod';

import { ApiError } from '../errors/api-error';
import type { ApiErrorResponse } from './response';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const timestamp = new Date().toISOString();
    const requestId = request.id;

    if (error instanceof ApiError) {
      const payload: ApiErrorResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
          timestamp,
        },
      };
      void reply.status(error.statusCode).send(payload);
      return;
    }

    if (error instanceof ZodError) {
      const payload: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.flatten(),
          requestId,
          timestamp,
        },
      };
      void reply.status(400).send(payload);
      return;
    }

    request.log.error({ error }, 'Unhandled error');
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        requestId,
        timestamp,
      },
    };
    void reply.status(500).send(payload);
  });

  app.setNotFoundHandler((request, reply) => {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };

    void reply.status(404).send(payload);
  });
}
