import crypto from 'node:crypto';

import { v4 as uuidv4 } from 'uuid';

import { getConfig } from '../../../config/env';
import type { SessionDocument } from '../models/session.model';
import { SessionModel } from '../models/session.model';

export class SessionService {
  public async createSession(input: {
    userId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<string> {
    const config = getConfig();
    const rawToken = uuidv4();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + config.SESSION_TTL_MINUTES * 60_000);

    await SessionModel.create({
      userId: input.userId,
      tokenHash,
      expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return rawToken;
  }

  public async revokeSession(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await SessionModel.findOneAndUpdate(
      { tokenHash, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
      { new: false },
    );
  }

  public async getActiveSessionByRawToken(rawToken: string): Promise<SessionDocument | null> {
    const tokenHash = this.hashToken(rawToken);
    return SessionModel.findOne({
      tokenHash,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
