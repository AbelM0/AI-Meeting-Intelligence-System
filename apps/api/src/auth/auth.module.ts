import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkService } from './clerk.service';
import { UsersService } from '../users/users.service';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [ClerkService, UsersService, ClerkAuthGuard],
  exports: [ClerkService, UsersService, ClerkAuthGuard],
})
export class AuthModule {}
