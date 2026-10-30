import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import { ApiError } from '../../shared/errors/api-error';
import type { UserRole } from './domain/user-role';
import { UserModel } from './models/user.model';
import { SessionService } from './services/session.service';

const sessionService = new SessionService();

export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
): Promise<void> => {
  const rawToken = request.cookies.sid;
  if (!rawToken) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }

  const session = await sessionService.getActiveSessionByRawToken(rawToken);
  if (!session) {
    throw new ApiError(401, 'SESSION_INVALID', 'Session is invalid or expired');
  }

  const user = await UserModel.findById(session.userId);
  if (!user) {
    throw new ApiError(401, 'USER_NOT_FOUND', 'Session user not found');
  }

  request.authUser = user;
};

export function requireRole(...roles: UserRole[]): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    if (!request.authUser) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required');
    }

    if (!roles.includes(request.authUser.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Insufficient permissions');
    }
  };
}
