'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AudioUploadAuthorization, Meeting } from '@meeting-intelligence/types';
import type { MeetingStatusValue } from '@meeting-intelligence/schemas';
import { useCallback, useRef, useState } from 'react';
import {
  confirmAudioUpload,
  createMeeting,
  deleteMeeting,
  getMeeting,
  getMeetingStatus,
  getMeetings,
  processMeeting,
  requestAudioUpload,
  retryMeeting,
} from '../api/meetings';
import {
  uploadMeetingAudio,
  type AudioUploadProgress,
  type MeetingAudioUpload,
} from '../uploads/upload-audio';

export const meetingQueryKeys = {
  all: ['meetings'] as const,
  detail: (id: string) => ['meetings', id] as const,
  status: (id: string) => ['meetings', id, 'status'] as const,
};

const ACTIVE_PROCESSING_STATUSES: readonly MeetingStatusValue[] = [
  'QUEUED',
  'PREPROCESSING',
  'TRANSCRIBING',
  'ANALYZING',
];

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

export function useMeetingStatus(id: string) {
  return useQuery({
    queryKey: meetingQueryKeys.status(id),
    queryFn: () => getMeetingStatus(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_PROCESSING_STATUSES.includes(status) ? 2_000 : false;
    },
  });
}

function useProcessingMutation(action: (meetingId: string) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: action,
    onSuccess: async (_, meetingId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meetingQueryKeys.status(meetingId) }),
        queryClient.invalidateQueries({ queryKey: meetingQueryKeys.detail(meetingId) }),
        queryClient.invalidateQueries({ queryKey: meetingQueryKeys.all }),
      ]);
    },
  });
}

export function useProcessMeeting() {
  return useProcessingMutation(processMeeting);
}

export function useRetryMeeting() {
  return useProcessingMutation(retryMeeting);
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

export type AudioUploadStage =
  'idle' | 'file_selected' | 'preparing' | 'uploading' | 'confirming' | 'success' | 'error';

export type AudioUploadFailure = 'transfer' | 'confirmation' | null;

const EMPTY_PROGRESS: AudioUploadProgress = {
  bytesUploaded: 0,
  bytesTotal: 0,
  percentage: 0,
};

export function useAudioUpload(meetingId: string) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<AudioUploadStage>('idle');
  const [progress, setProgress] = useState<AudioUploadProgress>(EMPTY_PROGRESS);
  const [failure, setFailure] = useState<AudioUploadFailure>(null);
  const uploadRef = useRef<MeetingAudioUpload | null>(null);
  const authorizationRef = useRef<AudioUploadAuthorization | null>(null);
  const fileRef = useRef<File | null>(null);

  const confirm = useCallback(
    async (file: File, authorization: AudioUploadAuthorization) => {
      setStage('confirming');
      setProgress({ bytesUploaded: file.size, bytesTotal: file.size, percentage: 100 });
      try {
        return await confirmAudioUpload(meetingId, {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          audioPath: authorization.path,
        });
      } catch (error) {
        setFailure('confirmation');
        setStage('error');
        throw error;
      }
    },
    [meetingId],
  );

  const mutation = useMutation({
    mutationFn: async (input: File | { file: File; confirmationOnly: true }) => {
      const file = input instanceof File ? input : input.file;
      const metadata = {
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      };

      fileRef.current = file;
      setFailure(null);
      setProgress({ bytesUploaded: 0, bytesTotal: file.size, percentage: 0 });
      setStage('preparing');
      let authorization = authorizationRef.current;
      if (!authorization) {
        try {
          authorization = await requestAudioUpload(meetingId, metadata);
        } catch (error) {
          setFailure('transfer');
          setStage('error');
          throw error;
        }
      }
      authorizationRef.current = authorization;

      if (!(input instanceof File) && input.confirmationOnly) {
        return confirm(file, authorization);
      }

      setStage('uploading');
      const activeUpload = uploadMeetingAudio({
        file,
        token: authorization.token,
        bucketName: authorization.bucket,
        storagePath: authorization.path,
        onProgress: setProgress,
      });
      uploadRef.current = activeUpload;
      try {
        await activeUpload.completion;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        setFailure('transfer');
        setStage('error');
        throw error;
      } finally {
        uploadRef.current = null;
      }

      return confirm(file, authorization);
    },
    onSuccess: async (meeting) => {
      queryClient.setQueryData(meetingQueryKeys.detail(meetingId), meeting);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meetingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: meetingQueryKeys.detail(meetingId) }),
      ]);
      authorizationRef.current = null;
      fileRef.current = null;
      setFailure(null);
      setStage('success');
    },
  });

  const selectFile = useCallback(() => {
    authorizationRef.current = null;
    fileRef.current = null;
    setFailure(null);
    setProgress(EMPTY_PROGRESS);
    setStage('file_selected');
    mutation.reset();
  }, [mutation]);

  const reset = useCallback(() => {
    authorizationRef.current = null;
    fileRef.current = null;
    setFailure(null);
    setProgress(EMPTY_PROGRESS);
    setStage('idle');
    mutation.reset();
  }, [mutation]);

  const cancel = useCallback(async () => {
    await uploadRef.current?.abort();
    uploadRef.current = null;
    setFailure(null);
    setStage(fileRef.current ? 'file_selected' : 'idle');
    mutation.reset();
  }, [mutation]);

  const retry = useCallback(() => {
    const file = fileRef.current;
    const authorization = authorizationRef.current;
    if (!file || mutation.isPending) return;

    if (failure === 'confirmation' && authorization) {
      mutation.mutate({ file, confirmationOnly: true });
      return;
    }

    mutation.mutate(file);
  }, [failure, mutation]);

  return { ...mutation, stage, progress, failure, selectFile, reset, cancel, retry };
}
