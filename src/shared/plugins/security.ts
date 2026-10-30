import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { getConfig } from '../../config/env';

export async function registerSecurityPlugins(app: FastifyInstance): Promise<void> {
  const config = getConfig();

  await app.register(helmet);

  await app.register(cors, {
    origin: config.CORS_ORIGINS.split(',').map((value) => value.trim()),
    credentials: true,
  });

  await app.register(cookie, {
    secret: config.COOKIE_SECRET,
    hook: 'onRequest',
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });
}
