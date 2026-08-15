import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [IntelligenceController],
  providers: [DeepSeekProvider, IntelligenceService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
