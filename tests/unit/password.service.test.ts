import { describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/services/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies password', async () => {
    const hash = await service.hash('StrongPassword123!');
    expect(hash).toBeTypeOf('string');

    const isValid = await service.verify(hash, 'StrongPassword123!');
    expect(isValid).toBe(true);
  });
});
