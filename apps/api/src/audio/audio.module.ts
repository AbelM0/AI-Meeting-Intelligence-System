import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AudioProcessingService } from './audio-processing.service';

@Module({
  imports: [StorageModule],
  providers: [AudioProcessingService],
  exports: [AudioProcessingService],
})
export class AudioModule {}
