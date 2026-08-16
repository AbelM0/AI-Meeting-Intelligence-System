import './config/load-server-env';
import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join, resolve } from 'node:path';
import { HealthController } from './health.controller';
import { MeetingsModule } from './meetings/meetings.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { validateServerEnv } from './config/server-env.validation';
import { RequestContextMiddleware } from './common/http/request-context.middleware';
import { RequestLoggingInterceptor } from './common/http/request-logging.interceptor';
import { userAwareTracker } from './common/rate-limit/user-aware-tracker';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { SharingModule } from './sharing/sharing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateServerEnv,
      envFilePath: [join(__dirname, '..', '.env'), resolve(__dirname, '..', '..', '..', '.env')],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('API_RATE_TTL_MS', 60_000),
            limit: config.get<number>('API_RATE_LIMIT', 120),
            getTracker: userAwareTracker,
          },
        ],
        errorMessage: 'Too many requests. Please try again shortly.',
      }),
    }),
    DatabaseModule,
    JobsModule,
    AuthModule,
    WebhooksModule,
    MeetingsModule,
    TranscriptionModule,
    IntelligenceModule,
    SharingModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
