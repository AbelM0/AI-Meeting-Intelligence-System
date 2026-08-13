import type {
  ConfirmAudioUploadInput,
  CreateMeetingInput,
  RequestAudioUploadInput,
} from '@meeting-intelligence/schemas';
import type {
  AudioUploadAuthorization,
  Meeting,
  MeetingProcessResponse,
  MeetingStatusResponse,
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
