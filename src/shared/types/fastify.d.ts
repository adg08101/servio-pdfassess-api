import type { UserDocument } from '../../modules/auth/models/user.model';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: UserDocument;
  }
}
