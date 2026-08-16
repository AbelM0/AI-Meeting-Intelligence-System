import type {
  ConfirmAudioUploadInput,
  CreateMeetingInput,
  CreateMeetingShareInput,
  RequestAudioUploadInput,
  UpdateActionItemInput,
  UpdateMeetingSpeakerInput,
} from '@meeting-intelligence/schemas';
import type {
  AudioUploadAuthorization,
  AudioPlaybackAuthorization,
  ActionItem,
  MeetingIntelligence,
  Meeting,
  MeetingListResponse,
  MeetingProcessResponse,
  MeetingStatusResponse,
  Transcript,
  TranscriptSpeaker,
  MeetingShareCreated,
  MeetingShareSummary,
  PublicMeetingShare,
} from '@meeting-intelligence/types';
import { apiClient } from '@/lib/api-client';

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>('/meetings', input);
  return data;
}

export async function getMeetings(cursor?: string): Promise<MeetingListResponse> {
  const { data } = await apiClient.get<MeetingListResponse>('/meetings', {
    params: { limit: 20, ...(cursor ? { cursor } : {}) },
  });
  return data;
}

export async function getAudioPlaybackUrl(meetingId: string): Promise<AudioPlaybackAuthorization> {
  const { data } = await apiClient.get<AudioPlaybackAuthorization>(
    `/meetings/${meetingId}/audio/url`,
  );
  return data;
}

export async function deleteMeetingAudio(meetingId: string): Promise<void> {
  await apiClient.delete(`/meetings/${meetingId}/audio`);
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data } = await apiClient.get<Meeting>(`/meetings/${id}`);
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  await apiClient.delete(`/meetings/${id}`);
}

export async function requestAudioUpload(
  meetingId: string,
  input: RequestAudioUploadInput,
): Promise<AudioUploadAuthorization> {
  const { data } = await apiClient.post<AudioUploadAuthorization>(
    `/meetings/${meetingId}/audio/upload-url`,
    input,
  );
  return data;
}

export async function confirmAudioUpload(
  meetingId: string,
  input: ConfirmAudioUploadInput,
): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>(`/meetings/${meetingId}/audio/confirm`, input);
  return data;
}

export async function processMeeting(meetingId: string): Promise<MeetingProcessResponse> {
  const { data } = await apiClient.post<MeetingProcessResponse>(`/meetings/${meetingId}/process`);
  return data;
}

export async function retryMeeting(meetingId: string): Promise<MeetingProcessResponse> {
  const { data } = await apiClient.post<MeetingProcessResponse>(`/meetings/${meetingId}/retry`);
  return data;
}

export async function reprocessMeeting(meetingId: string): Promise<MeetingProcessResponse> {
  const { data } = await apiClient.post<MeetingProcessResponse>(`/meetings/${meetingId}/reprocess`);
  return data;
}

export async function getMeetingStatus(meetingId: string): Promise<MeetingStatusResponse> {
  const { data } = await apiClient.get<MeetingStatusResponse>(`/meetings/${meetingId}/status`);
  return data;
}

export async function getMeetingTranscript(meetingId: string): Promise<Transcript> {
  const { data } = await apiClient.get<Transcript>(`/meetings/${meetingId}/transcript`);
  return data;
}

export async function getMeetingIntelligence(meetingId: string): Promise<MeetingIntelligence> {
  const { data } = await apiClient.get<MeetingIntelligence>(`/meetings/${meetingId}/intelligence`);
  return data;
}

export async function updateActionItemStatus(
  actionItemId: string,
  status: ActionItem['status'],
): Promise<ActionItem> {
  const { data } = await apiClient.patch<ActionItem>(`/action-items/${actionItemId}`, { status });
  return data;
}

export async function updateActionItem(
  actionItemId: string,
  input: UpdateActionItemInput,
): Promise<ActionItem> {
  const { data } = await apiClient.patch<ActionItem>(`/action-items/${actionItemId}`, input);
  return data;
}

export async function updateMeetingSpeaker(
  meetingId: string,
  speakerId: string,
  input: UpdateMeetingSpeakerInput,
): Promise<TranscriptSpeaker> {
  const { data } = await apiClient.patch<TranscriptSpeaker>(
    `/meetings/${meetingId}/speakers/${speakerId}`,
    input,
  );
  return data;
}

export async function createMeetingShare(
  meetingId: string,
  input: CreateMeetingShareInput,
): Promise<MeetingShareCreated> {
  const { data } = await apiClient.post<MeetingShareCreated>(
    `/meetings/${meetingId}/shares`,
    input,
  );
  return data;
}

export async function getMeetingShares(meetingId: string): Promise<MeetingShareSummary[]> {
  const { data } = await apiClient.get<MeetingShareSummary[]>(`/meetings/${meetingId}/shares`);
  return data;
}

export async function revokeMeetingShare(meetingId: string, shareId: string): Promise<void> {
  await apiClient.delete(`/meetings/${meetingId}/shares/${shareId}`);
}

export async function getPublicMeetingShare(token: string): Promise<PublicMeetingShare> {
  const { data } = await apiClient.get<PublicMeetingShare>(`/shares/${encodeURIComponent(token)}`);
  return data;
}
