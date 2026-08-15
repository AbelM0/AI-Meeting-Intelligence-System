export type TranscriptionInput = {
  filePath: string;
  language: string | null;
};

export type TranscriptionSegment = {
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number | null;
};

export type TranscriptionResult = {
  text: string;
  language: string | null;
  duration: number | null;
  segments: TranscriptionSegment[];
};

export interface TranscriptionProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export const TRANSCRIPTION_PROVIDER = Symbol('TRANSCRIPTION_PROVIDER');
