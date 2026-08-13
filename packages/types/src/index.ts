import type { MeetingStatusValue, ProcessingJobStatusValue } from '@meeting-intelligence/schemas';

export type WorkspaceInfo = {
  name: string;
};

export type HealthResponse = {
  status: 'ok';
};

export type Meeting = {
  id: string;
  title: string;
  audioPath: string | null;
  audioFileName: string | null;
  audioMimeType: string | null;
  fileSize: number | null;
  duration: number | null;
  language: string | null;
  status: MeetingStatusValue;
  createdAt: string;
  updatedAt: string;
};

export type AudioUploadAuthorization = {
  bucket: string;
  path: string;
  token: string;
};

export type MeetingProcessResponse = {
  meetingId: string;
  status: Extract<MeetingStatusValue, 'QUEUED'>;
};

export type MeetingProcessingStatus = {
  status: ProcessingJobStatusValue;
  progress: number;
  currentStage: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type MeetingStatusResponse = {
  meetingId: string;
  status: MeetingStatusValue;
  processing: MeetingProcessingStatus | null;
};
