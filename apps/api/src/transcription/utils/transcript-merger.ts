import type { AudioChunk } from '../../audio/types/audio-chunk';
import type { TranscriptionResult, TranscriptionSegment } from '../types/transcription-result';

type ChunkTranscript = {
  chunk: AudioChunk;
  result: TranscriptionResult;
};

export function mergeTranscriptChunks(
  chunkTranscripts: readonly ChunkTranscript[],
  preparedDurationSeconds: number | null,
): TranscriptionResult {
  const ordered = [...chunkTranscripts].sort((left, right) => left.chunk.index - right.chunk.index);
  const segments = ordered
    .flatMap(({ chunk, result }) =>
      result.segments.map<TranscriptionSegment>((segment) => ({
        startTime: chunk.startOffsetSeconds + segment.startTime,
        endTime: chunk.startOffsetSeconds + segment.endTime,
        text: cleanText(segment.text),
        confidence: segment.confidence ?? null,
      })),
    )
    .filter((segment) => segment.text.length > 0)
    .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime);

  const chunkText = ordered.map(({ result }) => {
    const parts =
      result.segments.length > 0 ? result.segments.map((segment) => segment.text) : [result.text];
    return parts.map(cleanText).filter(Boolean).join(' ');
  });
  const lastSegmentEnd = segments.at(-1)?.endTime ?? 0;
  const chunkDuration = ordered.reduce(
    (maximum, { chunk, result }) =>
      Math.max(maximum, chunk.startOffsetSeconds + (result.duration ?? chunk.durationSeconds)),
    0,
  );

  return {
    text: chunkText.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
    language: ordered.find(({ result }) => result.language)?.result.language ?? null,
    duration: Math.max(preparedDurationSeconds ?? 0, chunkDuration, lastSegmentEnd) || null,
    segments,
  };
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
