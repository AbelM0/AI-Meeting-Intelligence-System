import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { createReadStream } from 'node:fs';
import { DEFAULT_TRANSCRIPTION_MODEL } from '../transcription.constants';
import {
  type TranscriptionInput,
  type TranscriptionProvider,
  type TranscriptionResult,
} from '../types/transcription-result';

type RawTranscriptionSegment = {
  start?: unknown;
  end?: unknown;
  text?: unknown;
  confidence?: unknown;
};

type RawTranscriptionResponse = {
  text?: unknown;
  language?: unknown;
  duration?: unknown;
  segments?: unknown;
};

export type TranscriptionFailureCategory =
  | 'authentication'
  | 'rate_limit'
  | 'request_too_large'
  | 'unsupported_audio'
  | 'provider'
  | 'network'
  | 'malformed_response';

export class TranscriptionProviderError extends Error {
  constructor(
    message: string,
    readonly category: TranscriptionFailureCategory,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'TranscriptionProviderError';
  }
}

@Injectable()
export class GroqTranscriptionProvider implements TranscriptionProvider {
  private readonly logger = new Logger(GroqTranscriptionProvider.name);
  private readonly client: Groq;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('GROQ_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required to initialize transcription.');
    }

    this.model =
      config.get<string>('GROQ_TRANSCRIPTION_MODEL')?.trim() || DEFAULT_TRANSCRIPTION_MODEL;
    this.client = new Groq({ apiKey });
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const file = createReadStream(input.filePath);

    try {
      const response = await this.client.audio.transcriptions.create({
        file,
        model: this.model,
        ...(input.language ? { language: input.language } : {}),
        response_format: 'verbose_json',
        temperature: 0,
        timestamp_granularities: ['segment'],
      });

      return this.normalizeResponse(response);
    } catch (error) {
      const mappedError = this.mapError(error);
      this.logger.warn(
        `Groq transcription failed provider=groq model=${this.model} category=${mappedError.category} retryable=${mappedError.retryable} status=${this.statusOf(error) ?? 'unknown'}`,
      );
      throw mappedError;
    } finally {
      file.destroy();
    }
  }

  private normalizeResponse(response: RawTranscriptionResponse): TranscriptionResult {
    if (typeof response.text !== 'string') {
      throw new TranscriptionProviderError(
        'The transcription provider returned an invalid response.',
        'malformed_response',
        false,
      );
    }

    const rawSegments = response.segments === undefined ? [] : response.segments;
    if (!Array.isArray(rawSegments)) {
      throw new TranscriptionProviderError(
        'The transcription provider returned an invalid response.',
        'malformed_response',
        false,
      );
    }

    const segments = rawSegments.map((segment: RawTranscriptionSegment) => {
      const startTime = Number(segment.start);
      const endTime = Number(segment.end);
      const text = typeof segment.text === 'string' ? this.cleanText(segment.text) : '';

      if (
        !Number.isFinite(startTime) ||
        !Number.isFinite(endTime) ||
        startTime < 0 ||
        endTime < startTime ||
        typeof segment.text !== 'string'
      ) {
        throw new TranscriptionProviderError(
          'The transcription provider returned invalid timestamps.',
          'malformed_response',
          false,
        );
      }

      const confidence =
        typeof segment.confidence === 'number' && Number.isFinite(segment.confidence)
          ? segment.confidence
          : null;

      return { startTime, endTime, text, confidence };
    });

    const duration = Number(response.duration);
    return {
      text: this.cleanText(response.text),
      language:
        typeof response.language === 'string' && response.language.trim()
          ? response.language.trim().toLowerCase()
          : null,
      duration: Number.isFinite(duration) && duration >= 0 ? duration : null,
      segments: segments.filter((segment) => segment.text.length > 0),
    };
  }

  private mapError(error: unknown): TranscriptionProviderError {
    if (error instanceof TranscriptionProviderError) return error;

    const status = this.statusOf(error);
    if (status === 401 || status === 403) {
      return new TranscriptionProviderError(
        'Transcription authentication is not configured correctly.',
        'authentication',
        false,
      );
    }
    if (status === 413) {
      return new TranscriptionProviderError(
        'The transcription audio chunk is too large.',
        'request_too_large',
        false,
      );
    }
    if (status === 415 || status === 422 || status === 400) {
      return new TranscriptionProviderError(
        'The recording could not be processed by the transcription provider.',
        'unsupported_audio',
        false,
      );
    }
    if (status === 429) {
      return new TranscriptionProviderError(
        'Transcription is temporarily rate limited and will retry automatically.',
        'rate_limit',
        true,
      );
    }
    if (typeof status === 'number' && status >= 500) {
      return new TranscriptionProviderError(
        'The transcription provider is temporarily unavailable.',
        'provider',
        true,
      );
    }

    const code = this.codeOf(error);
    if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED') {
      return new TranscriptionProviderError(
        'The transcription provider could not be reached.',
        'network',
        true,
      );
    }

    return new TranscriptionProviderError(
      'Transcription failed. Retry processing when the service is available.',
      'network',
      true,
    );
  }

  private statusOf(error: unknown): number | null {
    if (typeof error !== 'object' || error === null || !('status' in error)) return null;
    const status = Number(error.status);
    return Number.isFinite(status) ? status : null;
  }

  private codeOf(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('code' in error)) return null;
    return typeof error.code === 'string' ? error.code : null;
  }

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}
