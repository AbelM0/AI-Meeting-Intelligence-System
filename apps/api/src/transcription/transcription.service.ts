import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { deepgramSignedUrlTtlSeconds } from './transcription.constants';
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
  phase: 'started' | 'completed';
};

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    private readonly storage: StorageService,
    @Inject(TRANSCRIPTION_PROVIDER) private readonly provider: TranscriptionProvider,
    private readonly config: ConfigService,
  ) {}

  async transcribeMeeting(
    input: MeetingTranscriptionInput,
    onProgress?: (progress: TranscriptionProgress) => Promise<void> | void,
  ): Promise<TranscriptionResult> {
    this.logger.log(
      `Transcription started meetingId=${input.meetingId} provider=deepgram stage=transcribing`,
    );
    await onProgress?.({ phase: 'started' });

    const audioUrl = await this.storage.createSignedReadUrl(
      input.audioPath,
      this.signedUrlTtlSeconds(),
    );
    const result = await this.provider.transcribe({
      audioUrl,
      language: this.languageHint(input.language),
      meetingId: input.meetingId,
    } satisfies TranscriptionInput);

    this.validateResult(result);
    await onProgress?.({ phase: 'completed' });
    this.logger.log(
      `Transcription completed meetingId=${input.meetingId} provider=deepgram stage=transcribing segments=${result.segments.length} speakers=${result.speakers.length} duration=${result.duration ?? 'unknown'}`,
    );
    return result;
  }

  private signedUrlTtlSeconds(): number {
    return deepgramSignedUrlTtlSeconds(
      this.config.get<number>('DEEPGRAM_TIMEOUT_MS', 600_000),
    );
  }

  private validateResult(result: TranscriptionResult): void {
    if (
      typeof result.text !== 'string' ||
      (result.language !== null && typeof result.language !== 'string') ||
      (result.duration !== null && (!Number.isFinite(result.duration) || result.duration < 0)) ||
      !Array.isArray(result.speakers) ||
      !Array.isArray(result.segments)
    ) {
      throw new Error('The transcription returned an invalid response.');
    }

    const speakerIds = new Set<number>();
    for (const speaker of result.speakers) {
      if (
        !Number.isInteger(speaker.providerSpeakerId) ||
        speaker.providerSpeakerId < 0 ||
        typeof speaker.label !== 'string' ||
        speaker.label.trim().length === 0 ||
        speakerIds.has(speaker.providerSpeakerId)
      ) {
        throw new Error('The transcription returned invalid speaker data.');
      }
      speakerIds.add(speaker.providerSpeakerId);
    }

    let previousStart = 0;
    for (const [index, segment] of result.segments.entries()) {
      if (
        !Number.isFinite(segment.startTime) ||
        !Number.isFinite(segment.endTime) ||
        segment.startTime < 0 ||
        segment.endTime < segment.startTime ||
        (index > 0 && segment.startTime < previousStart) ||
        typeof segment.text !== 'string' ||
        (segment.confidence !== null &&
          segment.confidence !== undefined &&
          !Number.isFinite(segment.confidence)) ||
        (segment.providerSpeakerId !== null &&
          segment.providerSpeakerId !== undefined &&
          (!Number.isInteger(segment.providerSpeakerId) ||
            segment.providerSpeakerId < 0 ||
            !speakerIds.has(segment.providerSpeakerId)))
      ) {
        throw new Error('The transcription returned invalid meeting segments.');
      }
      previousStart = segment.startTime;
    }
  }

  private languageHint(language: string | null): string | null {
    const normalized = language?.trim() ?? '';
    if (!/^[a-z]{2}(?:-[a-z]{2})?$/i.test(normalized)) return null;

    const [languageCode, region] = normalized.toLowerCase().split('-');
    return region ? `${languageCode}-${region.toUpperCase()}` : languageCode;
  }
}
