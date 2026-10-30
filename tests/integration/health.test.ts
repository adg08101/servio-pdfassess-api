import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app';
import { resetConfigCache } from '../../src/config/env';
import { stopMongoMemoryServer, startMongoMemoryServer } from '../helpers/mongo-memory';

describe('Health endpoint', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    process.env.MONGODB_URI = await startMongoMemoryServer();
    resetConfigCache();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await stopMongoMemoryServer();
  });

  it('returns 200 and service status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.status).toBe('ok');
  });
});
