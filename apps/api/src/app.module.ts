import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join, resolve } from 'node:path';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env'), resolve(__dirname, '..', '..', '..', '.env')],
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
