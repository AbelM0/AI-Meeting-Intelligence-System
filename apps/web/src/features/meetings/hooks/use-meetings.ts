'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Meeting } from '@meeting-intelligence/types';
import { useState } from 'react';
import {
  confirmAudioUpload,
  createMeeting,
  deleteMeeting,
  getMeeting,
  getMeetings,
  requestAudioUpload,
  uploadAudioToStorage,
} from '../api/meetings';

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

export type AudioUploadStage = 'idle' | 'authorizing' | 'uploading' | 'confirming';

export function useAudioUpload(meetingId: string) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<AudioUploadStage>('idle');

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const metadata = {
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      };

      setStage('authorizing');
      const authorization = await requestAudioUpload(meetingId, metadata);

      setStage('uploading');
      await uploadAudioToStorage(authorization, file);

      setStage('confirming');
      return confirmAudioUpload(meetingId, {
        ...metadata,
        audioPath: authorization.path,
      });
    },
    onSuccess: async (meeting) => {
      queryClient.setQueryData(meetingQueryKeys.detail(meetingId), meeting);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meetingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: meetingQueryKeys.detail(meetingId) }),
      ]);
    },
    onSettled: () => setStage('idle'),
  });

  return { ...mutation, stage };
}
