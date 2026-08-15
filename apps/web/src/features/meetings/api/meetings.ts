import type {
  ConfirmAudioUploadInput,
  CreateMeetingInput,
  RequestAudioUploadInput,
} from '@meeting-intelligence/schemas';
import type {
  AudioUploadAuthorization,
  ActionItem,
  MeetingIntelligence,
  Meeting,
  MeetingProcessResponse,
  MeetingStatusResponse,
  Transcript,
} from '@meeting-intelligence/types';
import { apiClient } from '@/lib/api-client';

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>('/meetings', input);
  return data;
}

export async function getMeetings(): Promise<Meeting[]> {
  const { data } = await apiClient.get<Meeting[]>('/meetings');
  return data;
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
