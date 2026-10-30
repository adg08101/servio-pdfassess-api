import { ApiError } from '../../shared/errors/api-error';
import type { UserRole } from './domain/user-role';
import { UserStatus } from './domain/user-status';
import { UserModel } from './models/user.model';
import type { LoginBody, RegisterBody } from './schemas/auth.schemas';
import type { PasswordService } from './services/password.service';

export class AuthService {
  public constructor(private readonly passwordService: PasswordService) {}

  public async register(
    input: RegisterBody,
  ): Promise<{ id: string; email: string; role: UserRole }> {
    const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'EMAIL_ALREADY_USED', 'Email is already registered');
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const user = await UserModel.create({
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      passwordHash,
      role: input.role,
      status: UserStatus.ACTIVE,
    });

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };
  }

  public async validateLogin(
    input: LoginBody,
  ): Promise<{ id: string; email: string; role: UserRole }> {
    const user = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiError(403, 'USER_INACTIVE', 'User is inactive');
    }

    const isValid = await this.passwordService.verify(user.passwordHash, input.password);
    if (!isValid) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };
  }
}
