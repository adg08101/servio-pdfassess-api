import Fastify from 'fastify';

import { buildLoggerOptions } from './config/logger';
import { connectMongo, disconnectMongo } from './infrastructure/database/mongoose';
import { registerRoutes } from './routes';
import { registerErrorHandler } from './shared/http/error-handler';
import { registerDocsPlugins } from './shared/plugins/docs';
import { registerSecurityPlugins } from './shared/plugins/security';

export async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger: buildLoggerOptions(),
    bodyLimit: 2 * 1024 * 1024,
    requestIdHeader: 'x-request-id',
  });

  await registerSecurityPlugins(app);
  await registerDocsPlugins(app);

  registerErrorHandler(app);

  app.addHook('onReady', async () => {
    await connectMongo();
  });

  app.addHook('onClose', async () => {
    await disconnectMongo();
  });

  await registerRoutes(app);

  return app;
}
