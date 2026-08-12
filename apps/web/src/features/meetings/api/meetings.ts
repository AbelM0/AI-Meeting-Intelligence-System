import type { CreateMeetingInput } from '@meeting-intelligence/schemas';
import type { Meeting } from '@meeting-intelligence/types';
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
