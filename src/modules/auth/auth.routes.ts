import type { FastifyInstance } from 'fastify';

import { getConfig } from '../../config/env';
import { ok } from '../../shared/http/response';
import { requireAuth } from './auth.middleware';
import { AuthService } from './auth.service';
import { loginBodySchema, registerBodySchema } from './schemas/auth.schemas';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';

const authService = new AuthService(new PasswordService());
const sessionService = new SessionService();

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const config = getConfig();

  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
      },
      config: {
        rateLimit: {
          max: config.AUTH_RATE_LIMIT_MAX,
          timeWindow: `${config.AUTH_RATE_LIMIT_WINDOW_MINUTES} minute`,
        },
      },
    },
    async (request, reply) => {
      const body = registerBodySchema.parse(request.body);
      const user = await authService.register(body);
      return ok(reply, user, 201);
    },
  );

  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
      },
      config: {
        rateLimit: {
          max: config.AUTH_RATE_LIMIT_MAX,
          timeWindow: `${config.AUTH_RATE_LIMIT_WINDOW_MINUTES} minute`,
        },
      },
    },
    async (request, reply) => {
      const body = loginBodySchema.parse(request.body);
      const user = await authService.validateLogin(body);
      const sid = await sessionService.createSession({
        userId: user.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      reply.setCookie('sid', sid, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.NODE_ENV === 'production',
        path: '/',
        maxAge: config.SESSION_TTL_MINUTES * 60,
      });

      return ok(reply, user);
    },
  );

  app.post('/auth/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    const sid = request.cookies.sid;
    if (sid) {
      await sessionService.revokeSession(sid);
    }

    reply.clearCookie('sid', {
      path: '/',
    });

    return ok(reply, { loggedOut: true });
  });

  app.get('/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.authUser;
    return ok(reply, {
      id: user?._id.toString(),
      email: user?.email,
      fullName: user?.fullName,
      role: user?.role,
      status: user?.status,
    });
  });
}
