import { Module } from '@nestjs/common';
import { AudioModule } from '../audio/audio.module';
import { GroqTranscriptionProvider } from './providers/groq-transcription.provider';
import { TRANSCRIPTION_PROVIDER } from './types/transcription-result';
import { TranscriptionService } from './transcription.service';

@Module({
  imports: [AudioModule],
  providers: [
    GroqTranscriptionProvider,
    TranscriptionService,
    { provide: TRANSCRIPTION_PROVIDER, useExisting: GroqTranscriptionProvider },
  ],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
