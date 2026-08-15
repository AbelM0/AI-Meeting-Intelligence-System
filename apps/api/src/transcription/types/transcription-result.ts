export type TranscriptionInput = {
  audioUrl: string;
  language: string | null;
  meetingId?: string;
};

export type TranscriptionWord = {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number | null;
  providerSpeakerId: number | null;
  speakerConfidence: number | null;
};

export type TranscriptionSpeaker = {
  providerSpeakerId: number;
  label: string;
};

export type TranscriptionSegment = {
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number | null;
  providerSpeakerId: number | null;
  words?: TranscriptionWord[];
};

export type TranscriptionResult = {
  text: string;
  language: string | null;
  duration: number | null;
  speakers: TranscriptionSpeaker[];
  segments: TranscriptionSegment[];
};

export interface TranscriptionProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export const TRANSCRIPTION_PROVIDER = Symbol('TRANSCRIPTION_PROVIDER');
