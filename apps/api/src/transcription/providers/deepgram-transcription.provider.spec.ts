import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  TranscriptionProviderError,
  normalizeDeepgramResponse,
} from './deepgram-transcription.provider';

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
