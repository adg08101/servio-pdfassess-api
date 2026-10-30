import type { FastifyBaseLogger, FastifyServerOptions } from 'fastify';

import { getConfig } from './env';

export function buildLoggerOptions(): FastifyServerOptions['logger'] {
  const config = getConfig();
  if (config.NODE_ENV === 'development') {
    return {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
      level: 'debug',
    };
  }

  return {
    level: 'info',
  };
}

export function childLogger(
  logger: FastifyBaseLogger,
  bindings: Record<string, unknown>,
): FastifyBaseLogger {
  return logger.child(bindings);
}
