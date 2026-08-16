import './config/load-server-env';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join, resolve } from 'node:path';
import { HealthController } from './health.controller';
import { MeetingsModule } from './meetings/meetings.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { validateServerEnv } from './config/server-env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateServerEnv,
      envFilePath: [join(__dirname, '..', '.env'), resolve(__dirname, '..', '..', '..', '.env')],
    }),
    AuthModule,
    WebhooksModule,
    MeetingsModule,
    TranscriptionModule,
    IntelligenceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
