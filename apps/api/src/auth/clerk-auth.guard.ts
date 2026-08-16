import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClerkService } from './clerk.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly clerk: ClerkService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: unknown }>();
    const user = await this.clerk.authenticate(request.headers.authorization);
    await this.users.ensureUser(user.clerkUserId);
    request.user = user;
    return true;
  }
}
