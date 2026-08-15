import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveEvidenceSegment } from './resolve-evidence-segment';

const segments = [
  { id: 'a', startTime: 20, endTime: 25 },
  { id: 'b', startTime: 28, endTime: 35 },
];

void test('resolves a timestamp contained by a segment', () => {
  assert.deepEqual(resolveEvidenceSegment(segments, 32, 60), {
    sourceStartTime: 32,
    sourceSegmentId: 'b',
  });
});

void test('resolves the nearest segment between utterances', () => {
  assert.equal(resolveEvidenceSegment(segments, 27, 60).sourceSegmentId, 'b');
});

void test('rejects negative and out-of-duration timestamps', () => {
  assert.deepEqual(resolveEvidenceSegment(segments, -10, 60), {
    sourceStartTime: null,
    sourceSegmentId: null,
  });
  assert.deepEqual(resolveEvidenceSegment(segments, 70, 60), {
    sourceStartTime: null,
    sourceSegmentId: null,
  });
});

void test('does not force a segment beyond the configured distance', () => {
  assert.equal(resolveEvidenceSegment(segments, 90, null, 30).sourceSegmentId, null);
});
