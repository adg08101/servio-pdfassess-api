import { Schema, model, models, type HydratedDocument, type Model } from 'mongoose';

import { UserRole } from '../domain/user-role';
import { UserStatus } from '../domain/user-status';

export interface User {
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true, index: true },
    status: { type: String, enum: Object.values(UserStatus), required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type UserDocument = HydratedDocument<User>;
export const UserModel =
  (models.users as Model<User> | undefined) ?? model<User>('users', userSchema);
