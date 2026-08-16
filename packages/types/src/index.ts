import type {
  ActionItemPriorityValue,
  ActionItemStatusValue,
  MeetingStatusValue,
  ProcessingJobStatusValue,
} from '@meeting-intelligence/schemas';

export type WorkspaceInfo = {
  name: string;
};

export type HealthResponse = {
  status: 'ok';
};

export type Meeting = {
  id: string;
  userId: string;
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

export type MeetingListItem = Meeting & {
  decisionCount: number;
  actionItemCount: number;
  speakerCount: number;
  summaryPreview: string | null;
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

export type TranscriptSpeaker = {
  id: string;
  providerSpeakerId: number;
  label: string;
  name: string | null;
};

export type TranscriptSegment = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number | null;
  speakerId: string | null;
  speaker: TranscriptSpeaker | null;
};

export type Transcript = {
  id: string;
  meetingId: string;
  fullText: string;
  language: string | null;
  duration: number | null;
  speakers: TranscriptSpeaker[];
  segments: TranscriptSegment[];
};

export type TranscriptResponse = Transcript;

export type MeetingSummary = {
  overview: string;
  keyTopics: string[];
  outcomes: string[];
  unresolvedIssues: string[];
};

export type Decision = {
  id: string;
  decision: string;
  context: string | null;
  evidence: string;
  sourceStartTime: number | null;
  sourceSegmentId: string | null;
  sourceSegment: EvidenceSourceSegment | null;
};

export type ActionItem = {
  id: string;
  task: string;
  owner: string | null;
  dueDate: string | null;
  priority: ActionItemPriorityValue;
  status: ActionItemStatusValue;
  evidence: string;
  sourceStartTime: number | null;
  sourceSegmentId: string | null;
  sourceSegment: EvidenceSourceSegment | null;
};

export type EvidenceSourceSegment = {
  id: string;
  startTime: number;
  endTime: number;
};

export type MeetingIntelligence = {
  summary: MeetingSummary;
  decisions: Decision[];
  actionItems: ActionItem[];
};
