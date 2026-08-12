'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Meeting } from '@meeting-intelligence/types';
import { createMeeting, deleteMeeting, getMeeting, getMeetings } from '../api/meetings';

export const meetingQueryKeys = {
  all: ['meetings'] as const,
  detail: (id: string) => ['meetings', id] as const,
};

export function useMeetings() {
  return useQuery({
    queryKey: meetingQueryKeys.all,
    queryFn: getMeetings,
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: meetingQueryKeys.detail(id),
    queryFn: () => getMeeting(id),
    enabled: Boolean(id),
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMeeting,
    onSuccess: async (meeting) => {
      queryClient.setQueryData(meetingQueryKeys.detail(meeting.id), meeting);
      await queryClient.invalidateQueries({ queryKey: meetingQueryKeys.all });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMeeting,
    onSuccess: async (_, id) => {
      queryClient.setQueryData<Meeting[]>(meetingQueryKeys.all, (meetings) =>
        meetings?.filter((meeting) => meeting.id !== id),
      );
      queryClient.removeQueries({ queryKey: meetingQueryKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: meetingQueryKeys.all });
    },
  });
}
