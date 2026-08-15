import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { DeepgramTranscriptionProvider } from './providers/deepgram-transcription.provider';
import { TRANSCRIPTION_PROVIDER } from './types/transcription-result';
import { TranscriptionService } from './transcription.service';

@Module({
  imports: [StorageModule],
  providers: [
    DeepgramTranscriptionProvider,
    TranscriptionService,
    { provide: TRANSCRIPTION_PROVIDER, useExisting: DeepgramTranscriptionProvider },
  ],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
