export type TimestampedTranscript = {
  fullText: string;
  segments: ReadonlyArray<{
    startTime: number;
    endTime?: number;
    text: string;
    speaker?: {
      label: string;
      name: string | null;
    } | null;
  }>;
};

export function formatTimestampedTranscript(transcript: TimestampedTranscript): string {
  const segments = transcript.segments
    .filter((segment) => segment.text.trim().length > 0)
    .sort((left, right) => left.startTime - right.startTime);

  if (segments.length === 0) {
    const fullText = transcript.fullText.trim();
    return fullText ? `[00:00]\n${fullText}` : '[00:00]\n[No spoken content detected]';
  }

  return segments
    .map((segment) => {
      const speakerName = segment.speaker ? (segment.speaker.name ?? segment.speaker.label) : null;
      const speakerPrefix = speakerName ? ` ${speakerName}:` : '';
      return `[${formatTranscriptTimestamp(segment.startTime)}]${speakerPrefix}\n${segment.text.trim()}`;
    })
    .join('\n\n');
}

export function estimateTranscriptTokens(timestampedTranscript: string): number {
  return Math.ceil(timestampedTranscript.length / 4);
}

export function formatTranscriptTimestamp(seconds: number): string {
  const boundedSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(boundedSeconds / 3_600);
  const minutes = Math.floor((boundedSeconds % 3_600) / 60);
  const remainingSeconds = boundedSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
