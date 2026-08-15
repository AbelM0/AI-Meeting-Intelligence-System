import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TranscriptSegment, TranscriptSpeaker } from '@meeting-intelligence/types';
import {
  findClosestTranscriptSegment,
  getSpeakerDisplayName,
  resolveActionOwnerDisplayName,
  segmentMatchesTranscriptSearch,
} from './meeting-display.ts';

const speaker: TranscriptSpeaker = {
  id: 'speaker-2',
  providerSpeakerId: 1,
  label: 'Speaker 2',
  name: 'Sarah',
};
const segments: TranscriptSegment[] = [
  {
    id: 'a',
    startTime: 0,
    endTime: 4,
    text: 'Authentication review',
    confidence: null,
    speakerId: speaker.id,
    speaker,
  },
  {
    id: 'b',
    startTime: 8,
    endTime: 12,
    text: 'Release timing',
    confidence: null,
    speakerId: null,
    speaker: null,
  },
];

void test('resolves renamed speakers and exact action owners', () => {
  assert.equal(getSpeakerDisplayName(speaker), 'Sarah');
  assert.equal(resolveActionOwnerDisplayName('Speaker 2', [speaker]), 'Sarah');
  assert.equal(resolveActionOwnerDisplayName('John', [speaker]), 'John');
  assert.equal(resolveActionOwnerDisplayName(null, [speaker]), 'Unassigned');
});

void test('finds the closest transcript segment', () => {
  assert.equal(findClosestTranscriptSegment(segments, 7)?.id, 'b');
});

void test('search is case insensitive and includes resolved speaker names', () => {
  assert.equal(segmentMatchesTranscriptSearch(segments[0], 'AUTHENTICATION'), true);
  assert.equal(segmentMatchesTranscriptSearch(segments[0], 'sarah'), true);
  assert.equal(segmentMatchesTranscriptSearch(segments[1], 'sarah'), false);
  assert.equal(segmentMatchesTranscriptSearch(segments[0], ''), true);
});
