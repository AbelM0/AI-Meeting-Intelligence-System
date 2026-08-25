export const DEFAULT_DEEPGRAM_TRANSCRIPTION_MODEL = 'whisper';
export const DEFAULT_DEEPGRAM_DIARIZATION_MODEL = 'latest';
export const DEFAULT_DEEPGRAM_SIGNED_URL_TTL_SECONDS = 300;

export function deepgramSignedUrlTtlSeconds(timeoutMs: number): number {
  return Math.max(DEFAULT_DEEPGRAM_SIGNED_URL_TTL_SECONDS, Math.ceil(timeoutMs / 1_000) + 60);
}
