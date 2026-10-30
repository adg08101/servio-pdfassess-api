import mongoose from 'mongoose';

import { getConfig } from '../../config/env';

export async function connectMongo(): Promise<void> {
  const config = getConfig();
  await mongoose.connect(config.MONGODB_URI, {
    dbName: undefined,
  });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export function mongoHealth(): { state: string; readyState: number } {
  const readyState = mongoose.connection.readyState;
  const stateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    state: stateMap[readyState] ?? 'unknown',
    readyState,
  };
}
