import { buildApp } from './app';
import { getConfig } from './config/env';

async function start(): Promise<void> {
  const app = await buildApp();
  const config = getConfig();

  try {
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    app.log.info({ port: config.PORT, host: config.HOST }, 'Server listening');
  } catch (error) {
    app.log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

void start();
