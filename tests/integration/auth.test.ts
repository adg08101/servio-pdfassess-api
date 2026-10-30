import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app';
import { UserRole } from '../../src/modules/auth/domain/user-role';
import { stopMongoMemoryServer, startMongoMemoryServer } from '../helpers/mongo-memory';

describe('Auth routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    process.env.MONGODB_URI = await startMongoMemoryServer();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await stopMongoMemoryServer();
  });

  it('registers, logs in, and reads /auth/me', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'student1@example.com',
        fullName: 'Student One',
        password: 'Password123!',
        role: UserRole.STUDENT,
      },
    });

    expect(registerResponse.statusCode).toBe(201);

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'student1@example.com',
        password: 'Password123!',
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const cookie = loginResponse.headers['set-cookie'];
    expect(cookie).toBeDefined();

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie: Array.isArray(cookie) ? cookie[0] : cookie,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().data.email).toBe('student1@example.com');
  });
});
