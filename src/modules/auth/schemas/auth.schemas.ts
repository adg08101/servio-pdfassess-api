import { z } from 'zod';

import { UserRole } from '../domain/user-role';

export const registerBodySchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(10).max(128),
  role: z.nativeEnum(UserRole).optional().default(UserRole.STUDENT),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
