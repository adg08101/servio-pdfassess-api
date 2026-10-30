import { getConfig } from '../config/env';
import { connectMongo, disconnectMongo } from '../infrastructure/database/mongoose';
import { UserRole } from '../modules/auth/domain/user-role';
import { UserStatus } from '../modules/auth/domain/user-status';
import { UserModel } from '../modules/auth/models/user.model';
import { PasswordService } from '../modules/auth/services/password.service';

async function seed(): Promise<void> {
  getConfig();
  await connectMongo();

  const passwordService = new PasswordService();
  const adminPasswordHash = await passwordService.hash('AdminPass123!');
  const studentPasswordHash = await passwordService.hash('StudentPass123!');

  await UserModel.updateOne(
    { email: 'admin@pdfassess.local' },
    {
      email: 'admin@pdfassess.local',
      fullName: 'System Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    { upsert: true },
  );

  await UserModel.updateOne(
    { email: 'student@pdfassess.local' },
    {
      email: 'student@pdfassess.local',
      fullName: 'Sample Student',
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
    { upsert: true },
  );

  await disconnectMongo();
}

void seed();
