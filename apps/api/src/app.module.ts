import './config/load-server-env';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join, resolve } from 'node:path';
import { HealthController } from './health.controller';
import { MeetingsModule } from './meetings/meetings.module';
import { TranscriptionModule } from './transcription/transcription.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env'), resolve(__dirname, '..', '..', '..', '.env')],
    }),
    MeetingsModule,
    TranscriptionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
