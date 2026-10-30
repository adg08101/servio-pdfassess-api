import type { FastifyReply } from 'fastify';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
  };
}

export function ok<T>(reply: FastifyReply, data: T, statusCode = 200): FastifyReply {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  return reply.status(statusCode).send(response);
}
