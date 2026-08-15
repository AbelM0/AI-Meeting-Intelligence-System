import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { MEETING_PROCESSING_QUEUE } from './jobs.constants';
import { MeetingQueueService } from './meeting-queue.service';
import { MeetingProcessor } from './processors/meeting.processor';
import { SimulatedPipelineService } from './simulated-pipeline.service';
import { workerRedisConnection } from './redis-connection';
import { TranscriptionModule } from '../transcription/transcription.module';
import { TranscriptModule } from '../transcript/transcript.module';

@Module({
  imports: [
    DatabaseModule,
    TranscriptionModule,
    TranscriptModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ connection: workerRedisConnection(config) }),
    }),
    BullModule.registerQueue({ name: MEETING_PROCESSING_QUEUE }),
  ],
  providers: [MeetingQueueService, MeetingProcessor, SimulatedPipelineService],
  exports: [MeetingQueueService],
})
export class JobsModule {}
