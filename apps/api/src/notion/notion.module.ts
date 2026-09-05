import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import {
  MeetingNotionExportController,
  NotionController,
  NotionOAuthController,
} from './notion.controller';
import { NotionService } from './notion.service';
import { NotionTokenCipherService } from './notion-token-cipher.service';

@Module({
  imports: [AuthModule, ConfigModule, DatabaseModule],
  controllers: [NotionController, NotionOAuthController, MeetingNotionExportController],
  providers: [NotionService, NotionTokenCipherService],
})
export class NotionModule {}
