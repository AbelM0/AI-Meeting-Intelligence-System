export const DEFAULT_EVIDENCE_MAX_DISTANCE_SECONDS = 30;
export const DEFAULT_TRANSCRIPT_DURATION_TOLERANCE_SECONDS = 5;

export type EvidenceSegment = {
  id: string;
  startTime: number;
  endTime: number;
};

export type ResolvedEvidence = {
  sourceStartTime: number | null;
  sourceSegmentId: string | null;
};

export function resolveEvidenceSegment(
  segments: readonly EvidenceSegment[],
  sourceStartTime: number | null,
  transcriptDuration: number | null,
  maxDistanceSeconds = DEFAULT_EVIDENCE_MAX_DISTANCE_SECONDS,
  durationToleranceSeconds = DEFAULT_TRANSCRIPT_DURATION_TOLERANCE_SECONDS,
): ResolvedEvidence {
  if (
    sourceStartTime === null ||
    !Number.isFinite(sourceStartTime) ||
    sourceStartTime < 0 ||
    (transcriptDuration !== null &&
      Number.isFinite(transcriptDuration) &&
      sourceStartTime > transcriptDuration + durationToleranceSeconds)
  ) {
    return { sourceStartTime: null, sourceSegmentId: null };
  }

  const orderedSegments = [...segments].sort(
    (left, right) => left.startTime - right.startTime || left.id.localeCompare(right.id),
  );
  const containing = orderedSegments.find(
    (segment) => segment.startTime <= sourceStartTime && segment.endTime >= sourceStartTime,
  );
  if (containing) {
    return { sourceStartTime, sourceSegmentId: containing.id };
  }

  const closest = orderedSegments.reduce<
    { segment: EvidenceSegment; distance: number } | undefined
  >((current, segment) => {
    const distance = Math.min(
      Math.abs(sourceStartTime - segment.startTime),
      Math.abs(sourceStartTime - segment.endTime),
    );
    if (!current || distance < current.distance) return { segment, distance };
    return current;
  }, undefined);

  return closest && closest.distance <= maxDistanceSeconds
    ? { sourceStartTime, sourceSegmentId: closest.segment.id }
    : { sourceStartTime, sourceSegmentId: null };
}
