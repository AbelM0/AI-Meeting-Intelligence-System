import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  estimateTranscriptTokens,
  formatTimestampedTranscript,
} from './format-timestamped-transcript';

void test('formats transcript segments in chronological timestamp order', () => {
  const formatted = formatTimestampedTranscript({
    fullText: 'Fallback text',
    segments: [
      { startTime: 4_344, text: 'An hour-long discussion.' },
      { startTime: 14, text: 'Authentication is the first topic.' },
      { startTime: 0, text: 'Good morning everyone.' },
    ],
  });

  assert.equal(
    formatted,
    '[00:00]\nGood morning everyone.\n\n[00:14]\nAuthentication is the first topic.\n\n[01:12:24]\nAn hour-long discussion.',
  );
});

void test('falls back to full text and estimates tokens deterministically', () => {
  const formatted = formatTimestampedTranscript({ fullText: 'Fallback transcript.', segments: [] });
  assert.equal(formatted, '[00:00]\nFallback transcript.');
  assert.equal(estimateTranscriptTokens('12345678'), 2);
});
