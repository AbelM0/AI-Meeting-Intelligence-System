import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TranscriptService } from './transcript.service';

@Module({
  imports: [DatabaseModule],
  providers: [TranscriptService],
  exports: [TranscriptService],
})
export class TranscriptModule {}
