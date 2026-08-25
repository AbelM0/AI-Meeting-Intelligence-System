import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import {
  DeepgramTranscriptionProvider,
  TranscriptionProviderError,
  getDeepgramErrorDetails,
  isRetryableDeepgramTransportError,
  normalizeDeepgramResponse,
} from './deepgram-transcription.provider';
import { deepgramSignedUrlTtlSeconds } from '../transcription.constants';

function response(overrides: Record<string, unknown> = {}) {
  return {
    metadata: { request_id: 'fixture-request', duration: 12.5 },
    results: {
      channels: [
        {
          detected_language: 'en',
          alternatives: [{ transcript: 'Good morning. I will send the plan.', confidence: 0.97 }],
        },
      ],
      utterances: [
        {
          start: 0,
          end: 2.4,
          confidence: 0.96,
          transcript: 'Good morning.',
          speaker: 0,
          words: [
            {
              word: 'Good',
              start: 0,
              end: 0.4,
              confidence: 0.99,
              speaker: 0,
              speaker_confidence: 0.91,
            },
          ],
        },
        {
          start: 3,
          end: 6,
          confidence: 0.94,
          transcript: 'I will send the plan.',
          speaker: 1,
        },
      ],
    },
    ...overrides,
  };
}

void test('normalizes one request response with speaker 0, speaker 1, confidence, and words', () => {
  const result = normalizeDeepgramResponse(response());

  assert.equal(result.text, 'Good morning. I will send the plan.');
  assert.equal(result.language, 'en');
  assert.equal(result.duration, 12.5);
  assert.deepEqual(result.speakers, [
    { providerSpeakerId: 0, label: 'Speaker 1' },
    { providerSpeakerId: 1, label: 'Speaker 2' },
  ]);
  assert.equal(result.segments[0]?.providerSpeakerId, 0);
  assert.equal(result.segments[1]?.providerSpeakerId, 1);
  assert.equal(result.segments[0]?.confidence, 0.96);
  assert.equal(result.segments[0]?.words?.[0]?.speakerConfidence, 0.91);
});

void test('allows empty utterances and missing optional speaker metadata', () => {
  const result = normalizeDeepgramResponse(
    response({
      results: {
        channels: [{ alternatives: [{ transcript: 'Background audio was silent.' }] }],
        utterances: [
          { start: 0, end: 1, transcript: '', confidence: 0.2 },
          { start: 1, end: 2, transcript: 'Background audio was silent.' },
        ],
      },
    }),
  );

  assert.equal(result.speakers.length, 0);
  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0]?.providerSpeakerId, null);
});

void test('rejects malformed timestamps and missing canonical transcript data', () => {
  assert.throws(
    () =>
      normalizeDeepgramResponse(
        response({
          results: {
            channels: [{ alternatives: [{ transcript: 'Invalid.' }] }],
            utterances: [{ start: 4, end: 2, transcript: 'Invalid.', speaker: 0 }],
          },
        }),
      ),
    (error: unknown) =>
      error instanceof TranscriptionProviderError && error.category === 'malformed_response',
  );

  assert.throws(() => normalizeDeepgramResponse({ results: { channels: [] } }), /invalid response/);
});

void test('extracts a nested fetch cause without converting a null status to zero', () => {
  const error = Object.assign(new TypeError('fetch failed'), {
    cause: Object.assign(new Error('connection timed out'), {
      code: 'UND_ERR_CONNECT_TIMEOUT',
    }),
  });

  assert.deepEqual(getDeepgramErrorDetails(error), {
    status: null,
    requestId: null,
    transportCode: 'UND_ERR_CONNECT_TIMEOUT',
    transportName: 'TypeError',
  });
  assert.equal(isRetryableDeepgramTransportError(error), true);

  const mapped = new TranscriptionProviderError('mapped', 'network', true);
  assert.equal(getDeepgramErrorDetails(mapped).status, null);
});

void test('does not classify provider HTTP responses as transport retries', () => {
  assert.equal(
    isRetryableDeepgramTransportError({
      statusCode: 503,
      metadata: { request_id: 'provider-request' },
    }),
    false,
  );
});

void test('keeps the signed audio URL valid beyond the Deepgram timeout', () => {
  assert.equal(deepgramSignedUrlTtlSeconds(600_000), 660);
  assert.equal(deepgramSignedUrlTtlSeconds(60_000), 300);
});

void test('retries one rejected fetch inside the same transcription call', async () => {
  const provider = new DeepgramTranscriptionProvider(
    new ConfigService({
      DEEPGRAM_API_KEY: 'fixture-key',
      DEEPGRAM_NETWORK_RETRY_DELAY_MS: 1,
      DEEPGRAM_TIMEOUT_MS: 10_000,
    }),
  );
  let attempts = 0;
  const client = provider as unknown as {
    mediaClient: {
      transcribeUrl: (...args: unknown[]) => Promise<unknown>;
    };
  };
  client.mediaClient.transcribeUrl = () => {
    attempts += 1;
    if (attempts === 1) {
      return Promise.reject(
        Object.assign(new TypeError('fetch failed'), {
          cause: { code: 'EAI_AGAIN' },
        }),
      );
    }
    return Promise.resolve(response());
  };

  const result = await provider.transcribe({
    audioUrl: 'https://storage.example.test/signed-audio',
    language: null,
    meetingId: 'meeting-fixture',
  });

  assert.equal(attempts, 2);
  assert.equal(result.text, 'Good morning. I will send the plan.');
});
