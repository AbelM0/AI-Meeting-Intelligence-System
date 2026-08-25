import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepgramClient } from '@deepgram/sdk';
import { getCurrentRunTree, traceable } from 'langsmith/traceable';
import {
  DEFAULT_DEEPGRAM_DIARIZATION_MODEL,
  DEFAULT_DEEPGRAM_TRANSCRIPTION_MODEL,
} from '../transcription.constants';
import {
  type TranscriptionInput,
  type TranscriptionProvider,
  type TranscriptionResult,
  type TranscriptionSegment,
  type TranscriptionSpeaker,
  type TranscriptionWord,
} from '../types/transcription-result';

type RawRecord = Record<string, unknown>;

export type TranscriptionFailureCategory =
  | 'authentication'
  | 'insufficient_credits'
  | 'rate_limit'
  | 'request_too_large'
  | 'unsupported_audio'
  | 'provider'
  | 'network'
  | 'timeout'
  | 'malformed_response';

export class TranscriptionProviderError extends Error {
  providerStatus: number | null = null;
  providerRequestId: string | null = null;

  constructor(
    message: string,
    readonly category: TranscriptionFailureCategory,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'TranscriptionProviderError';
  }
}

type DeepgramTraceResult = {
  result: TranscriptionResult;
  providerRequestId: string | null;
};

@Injectable()
export class DeepgramTranscriptionProvider implements TranscriptionProvider {
  private readonly logger = new Logger(DeepgramTranscriptionProvider.name);
  private readonly client: DeepgramClient;
  private readonly model: string;
  private readonly diarizationModel: string;
  private readonly tracedTranscription: (
    input: TranscriptionInput,
  ) => Promise<DeepgramTraceResult>;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('DEEPGRAM_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY is required to initialize transcription.');
    }

    this.model =
      config.get<string>('DEEPGRAM_TRANSCRIPTION_MODEL')?.trim() ||
      DEFAULT_DEEPGRAM_TRANSCRIPTION_MODEL;
    this.diarizationModel =
      config.get<string>('DEEPGRAM_DIARIZATION_MODEL')?.trim() ||
      DEFAULT_DEEPGRAM_DIARIZATION_MODEL;
    this.client = new DeepgramClient({ apiKey });
    this.tracedTranscription = traceable(
      async (input: TranscriptionInput): Promise<DeepgramTraceResult> => {
        this.addTraceContext(input);

        try {
          const response = await this.client.listen.v1.media.transcribeUrl(
            {
              url: input.audioUrl,
              model: this.model,
              smart_format: true,
              utterances: true,
              diarize_model: this.diarizationModel,
              punctuate: true,
              ...(input.language ? { language: input.language } : { detect_language: true }),
            },
            {
              timeoutInSeconds: Math.ceil(
                this.config.get<number>('DEEPGRAM_TIMEOUT_MS', 600_000) / 1_000,
              ),
              maxRetries: 0,
            },
          );
          const normalized = normalizeDeepgramResponse(response);

          return {
            result: normalized.language
              ? normalized
              : { ...normalized, language: input.language },
            providerRequestId: getRequestId(response),
          };
        } catch (error) {
          const mappedError = this.mapError(error);
          mappedError.providerStatus = this.statusOf(error);
          mappedError.providerRequestId = getRequestId(error);
          this.addTraceFailure(mappedError);
          throw mappedError;
        }
      },
      {
        name: 'deepgram.transcribe',
        run_type: 'tool',
        tags: ['ai-provider', 'deepgram', 'transcription'],
        metadata: {
          provider: 'deepgram',
          model: this.model,
          diarization_model: this.diarizationModel,
        },
        processInputs: (input) => ({
          meeting_id: input.meetingId ?? null,
          language: input.language,
          audio_source: 'signed_url',
        }),
        processOutputs: (output) => ({
          provider_request_id: output.providerRequestId,
          language: output.result.language,
          duration_seconds: output.result.duration,
          segment_count: output.result.segments.length,
          speaker_count: output.result.speakers.length,
          transcript_characters: output.result.text.length,
        }),
      },
    );
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    try {
      const response = await this.tracedTranscription(input);

      this.logger.log(
        `Deepgram transcription completed meetingId=${input.meetingId ?? 'unknown'} provider=deepgram model=${this.model} requestId=${response.providerRequestId ?? 'unknown'} stage=transcribing segments=${response.result.segments.length} speakers=${response.result.speakers.length}`,
      );
      return response.result;
    } catch (error) {
      const mappedError = this.mapError(error);
      this.logger.warn(
        `Deepgram transcription failed meetingId=${input.meetingId ?? 'unknown'} provider=deepgram model=${this.model} requestId=${getRequestId(error) ?? 'unknown'} stage=transcribing category=${mappedError.category} retryable=${mappedError.retryable} status=${this.statusOf(error) ?? 'unknown'}`,
      );
      throw mappedError;
    }
  }

  private addTraceContext(input: TranscriptionInput): void {
    const runTree = getCurrentRunTree();
    if (!runTree) return;

    runTree.metadata = {
      ...runTree.metadata,
      meeting_id: input.meetingId ?? null,
      language: input.language,
    };
  }

  private addTraceFailure(error: TranscriptionProviderError): void {
    const runTree = getCurrentRunTree();
    if (!runTree) return;

    runTree.metadata = {
      ...runTree.metadata,
      error_category: error.category,
      retryable: error.retryable,
      provider_status: error.providerStatus,
      provider_request_id: error.providerRequestId,
    };
    runTree.tags = [...(runTree.tags ?? []), `error:${error.category}`];
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
    if (status === 402) {
      return new TranscriptionProviderError(
        'The transcription provider account does not have enough credits.',
        'insufficient_credits',
        false,
      );
    }
    if (status === 413) {
      return new TranscriptionProviderError(
        'The recording is too large for the transcription provider.',
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
    if (status === 408) {
      return new TranscriptionProviderError(
        'The transcription provider timed out. Retry processing when the service is available.',
        'timeout',
        true,
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
    if (
      code === 'ETIMEDOUT' ||
      code === 'UND_ERR_CONNECT_TIMEOUT' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      this.nameOf(error)?.toLowerCase().includes('timeout')
    ) {
      return new TranscriptionProviderError(
        'The transcription provider timed out or could not be reached.',
        'timeout',
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
    if (!isRecord(error)) return null;

    for (const key of ['providerStatus', 'status', 'statusCode', 'status_code']) {
      const status = Number(error[key]);
      if (Number.isFinite(status)) return status;
    }

    if (isRecord(error.response)) {
      const status = Number(error.response.status);
      return Number.isFinite(status) ? status : null;
    }

    return null;
  }

  private codeOf(error: unknown): string | null {
    if (!isRecord(error)) return null;
    return typeof error.code === 'string' ? error.code : null;
  }

  private nameOf(error: unknown): string | null {
    if (!isRecord(error)) return null;
    return typeof error.name === 'string' ? error.name : null;
  }
}

export function normalizeDeepgramResponse(response: unknown): TranscriptionResult {
  const rawResponse = unwrapResponse(response);
  const results = rawResponse.results;
  if (!isRecord(results)) {
    throw malformedResponse();
  }

  const channels = results.channels;
  if (!Array.isArray(channels) || channels.length === 0) {
    throw malformedResponse();
  }

  const rawChannels: unknown[] = channels;
  const channelTranscripts: string[] = [];
  let detectedLanguage: string | null = null;

  for (const rawChannel of rawChannels) {
    if (!isRecord(rawChannel)) throw malformedResponse();
    const alternatives = rawChannel.alternatives;
    if (!Array.isArray(alternatives) || alternatives.length === 0) {
      throw malformedResponse();
    }

    const alternative: unknown = alternatives[0];
    if (!isRecord(alternative) || typeof alternative.transcript !== 'string') {
      throw malformedResponse();
    }

    channelTranscripts.push(cleanText(alternative.transcript));
    detectedLanguage ??= normalizeLanguage(rawChannel.detected_language);
  }

  const rawUtterances = results.utterances;
  if (rawUtterances !== undefined && !Array.isArray(rawUtterances)) {
    throw malformedResponse();
  }

  const speakers = new Map<number, TranscriptionSpeaker>();
  const segments: TranscriptionSegment[] = [];
  const utterances: unknown[] = rawUtterances ?? [];
  for (const rawUtterance of utterances) {
    if (!isRecord(rawUtterance)) throw malformedResponse();

    const startTime = requiredNumber(rawUtterance.start);
    const endTime = requiredNumber(rawUtterance.end);
    if (startTime < 0 || endTime < startTime) throw malformedResponse();
    if (typeof rawUtterance.transcript !== 'string') throw malformedResponse();

    const providerSpeakerId = optionalSpeakerId(rawUtterance.speaker);
    if (providerSpeakerId !== null) {
      speakers.set(providerSpeakerId, {
        providerSpeakerId,
        label: `Speaker ${providerSpeakerId + 1}`,
      });
    }

    const text = cleanText(rawUtterance.transcript);
    const words = normalizeWords(rawUtterance.words);
    if (!text) continue;

    segments.push({
      startTime,
      endTime,
      text,
      confidence: optionalConfidence(rawUtterance.confidence),
      providerSpeakerId,
      ...(words ? { words } : {}),
    });
  }

  const metadata = isRecord(rawResponse.metadata) ? rawResponse.metadata : null;
  const duration = optionalDuration(metadata?.duration);
  const text = channelTranscripts.join(' ').trim();

  return {
    text,
    language: detectedLanguage,
    duration,
    speakers: [...speakers.values()].sort(
      (left, right) => left.providerSpeakerId - right.providerSpeakerId,
    ),
    segments,
  };
}

function unwrapResponse(response: unknown): RawRecord {
  if (!isRecord(response)) throw malformedResponse();
  if (isRecord(response.results)) return response;
  if (isRecord(response.data) && isRecord(response.data.results)) return response.data;
  throw malformedResponse();
}

function normalizeWords(value: unknown): TranscriptionWord[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw malformedResponse();

  const rawWords: unknown[] = value;
  return rawWords.map((rawWord) => {
    if (!isRecord(rawWord) || typeof rawWord.word !== 'string' || !rawWord.word.trim()) {
      throw malformedResponse();
    }

    const startTime = requiredNumber(rawWord.start);
    const endTime = requiredNumber(rawWord.end);
    if (startTime < 0 || endTime < startTime) throw malformedResponse();

    return {
      word: rawWord.word,
      startTime,
      endTime,
      confidence: optionalConfidence(rawWord.confidence),
      providerSpeakerId: optionalSpeakerId(rawWord.speaker),
      speakerConfidence: optionalConfidence(rawWord.speaker_confidence),
    };
  });
}

function requiredNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw malformedResponse();
  return value;
}

function optionalDuration(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const duration = requiredNumber(value);
  if (duration < 0) throw malformedResponse();
  return duration;
}

function optionalConfidence(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  return requiredNumber(value);
}

function optionalSpeakerId(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw malformedResponse();
  }
  return value;
}

function normalizeLanguage(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().toLowerCase();
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformedResponse(): TranscriptionProviderError {
  return new TranscriptionProviderError(
    'The transcription provider returned an invalid response.',
    'malformed_response',
    false,
  );
}

function getRequestId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.providerRequestId === 'string') return value.providerRequestId;
  const metadata = isRecord(value.metadata)
    ? value.metadata
    : isRecord(value.data) && isRecord(value.data.metadata)
      ? value.data.metadata
      : isRecord(value.response) && isRecord(value.response.metadata)
        ? value.response.metadata
      : null;
  return metadata && typeof metadata.request_id === 'string' ? metadata.request_id : null;
}
