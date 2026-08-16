import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MeetingSharesController, PublicSharesController } from './sharing.controller';
import { SharingService } from './sharing.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MeetingSharesController, PublicSharesController],
  providers: [SharingService],
})
export class SharingModule {}
