import type { TranscriptSegment, TranscriptSpeaker } from '@meeting-intelligence/types';

type DisplaySpeaker = Pick<TranscriptSpeaker, 'label' | 'name'>;

export type EvidenceTarget = {
  sourceSegmentId: string | null;
  sourceStartTime: number | null;
  requestId: number;
};

export function getSpeakerDisplayName(speaker: DisplaySpeaker): string {
  return speaker.name ?? speaker.label;
}

export function getSpeakerMarker(speaker: TranscriptSpeaker): string {
  if (speaker.name) {
    return Array.from(speaker.name.trim())[0]?.toLocaleUpperCase() ?? 'S';
  }
  const generatedNumber = speaker.label.match(/^Speaker\s+(\d+)$/i)?.[1];
  return generatedNumber ? `S${generatedNumber}` : speaker.label.slice(0, 2).toLocaleUpperCase();
}

export function resolveActionOwnerDisplayName(
  owner: string | null,
  speakers: readonly DisplaySpeaker[],
): string {
  if (owner === null) return 'Unassigned';
  const matchingSpeaker = speakers.find((speaker) => speaker.label === owner);
  return matchingSpeaker ? getSpeakerDisplayName(matchingSpeaker) : owner;
}

export function findClosestTranscriptSegment(
  segments: readonly TranscriptSegment[],
  sourceStartTime: number,
): TranscriptSegment | null {
  if (!Number.isFinite(sourceStartTime) || segments.length === 0) return null;
  return segments.reduce<TranscriptSegment | null>((closest, segment) => {
    if (!closest) return segment;
    const segmentDistance = Math.min(
      Math.abs(sourceStartTime - segment.startTime),
      Math.abs(sourceStartTime - segment.endTime),
    );
    const closestDistance = Math.min(
      Math.abs(sourceStartTime - closest.startTime),
      Math.abs(sourceStartTime - closest.endTime),
    );
    return segmentDistance < closestDistance ? segment : closest;
  }, null);
}

export function segmentMatchesTranscriptSearch(segment: TranscriptSegment, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  const speakerName = segment.speaker ? getSpeakerDisplayName(segment.speaker) : '';
  return (
    segment.text.toLocaleLowerCase().includes(normalizedQuery) ||
    speakerName.toLocaleLowerCase().includes(normalizedQuery)
  );
}
