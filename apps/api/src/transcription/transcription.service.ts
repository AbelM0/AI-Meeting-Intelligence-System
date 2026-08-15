import { Inject, Injectable, Logger } from '@nestjs/common';
import { AudioProcessingService } from '../audio/audio-processing.service';
import type { AudioChunk } from '../audio/types/audio-chunk';
import { mergeTranscriptChunks } from './utils/transcript-merger';
import {
  TRANSCRIPTION_PROVIDER,
  type TranscriptionInput,
  type TranscriptionProvider,
  type TranscriptionResult,
} from './types/transcription-result';

export type MeetingTranscriptionInput = {
  meetingId: string;
  audioPath: string;
  language: string | null;
};

export type TranscriptionProgress = {
  completedChunks: number;
  totalChunks: number;
};

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    private readonly audio: AudioProcessingService,
    @Inject(TRANSCRIPTION_PROVIDER) private readonly provider: TranscriptionProvider,
  ) {}

  async transcribeMeeting(
    input: MeetingTranscriptionInput,
    onProgress?: (progress: TranscriptionProgress) => Promise<void> | void,
  ): Promise<TranscriptionResult> {
    this.logger.log(`Transcription started meetingId=${input.meetingId}`);
    const prepared = await this.audio.prepareAudio({
      meetingId: input.meetingId,
      audioPath: input.audioPath,
    });

    try {
      await onProgress?.({ completedChunks: 0, totalChunks: prepared.chunks.length });

      const chunkTranscripts: Array<{ chunk: AudioChunk; result: TranscriptionResult }> = [];
      for (const chunk of prepared.chunks) {
        this.logger.log(
          `Transcribing chunk meetingId=${input.meetingId} chunk=${chunk.index + 1}/${prepared.chunks.length}`,
        );

        const result = await this.provider.transcribe({
          filePath: chunk.path,
          language: this.languageHint(input.language),
        } satisfies TranscriptionInput);
        chunkTranscripts.push({ chunk, result });
        await onProgress?.({
          completedChunks: chunk.index + 1,
          totalChunks: prepared.chunks.length,
        });
      }

      const merged = mergeTranscriptChunks(chunkTranscripts, prepared.durationSeconds);
      this.validateMergedTranscript(merged);
      this.logger.log(
        `Transcription completed meetingId=${input.meetingId} segments=${merged.segments.length} duration=${merged.duration ?? 'unknown'}`,
      );
      return merged;
    } finally {
      await this.audio.cleanup(prepared.workspacePath);
    }
  }

  private validateMergedTranscript(result: TranscriptionResult): void {
    let previousStart = 0;
    for (const [index, segment] of result.segments.entries()) {
      if (
        !Number.isFinite(segment.startTime) ||
        !Number.isFinite(segment.endTime) ||
        segment.startTime < 0 ||
        segment.endTime < segment.startTime ||
        (index > 0 && segment.startTime < previousStart)
      ) {
        throw new Error('The transcription returned invalid meeting timestamps.');
      }
      previousStart = segment.startTime;
    }
  }

  private languageHint(language: string | null): string | null {
    const normalized = language?.trim().toLowerCase() ?? '';
    return /^[a-z]{2}$/.test(normalized) ? normalized : null;
  }
}
