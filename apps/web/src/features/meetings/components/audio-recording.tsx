'use client';

import type { Meeting } from '@meeting-intelligence/types';
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  SpinnerGapIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAudioUpload } from '../hooks/use-meetings';
import { AudioDropzone, formatFileSize } from './audio-dropzone';
import { UploadProgress } from './upload-progress';

export function AudioRecording({ meeting }: Readonly<{ meeting: Meeting }>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const uploadMutation = useAudioUpload(meeting.id);
  const hasRecording = Boolean(meeting.audioPath && meeting.audioFileName && meeting.fileSize);

  function upload() {
    if (!selectedFile || uploadMutation.isPending) return;
    uploadMutation.mutate(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        setIsReplacing(false);
      },
    });
  }

  const isBusy = uploadMutation.isPending;

  function resetSelection(file: File | null) {
    if (file) uploadMutation.selectFile();
    else uploadMutation.reset();
    setSelectedFile(file);
  }

  if (hasRecording && !isReplacing) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
              <CheckCircleIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#111827]">
                {meeting.audioFileName}
              </p>
              <p className="mt-1 font-mono text-xs text-[#4b5563]">
                {formatFileSize(meeting.fileSize ?? 0)} / Upload complete
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReplacing(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-[#374151] transition duration-200 hover:border-emerald-400 hover:text-emerald-800 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <ArrowsClockwiseIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            Replace recording
          </button>
        </div>
      </div>
    );
  }

  const actionLabel =
    uploadMutation.stage === 'preparing'
      ? 'Preparing secure upload…'
      : uploadMutation.stage === 'uploading'
        ? `Uploading… ${uploadMutation.progress.percentage}%`
        : uploadMutation.stage === 'confirming'
          ? 'Finalizing upload…'
          : 'Upload recording';

  return (
    <div className="space-y-4">
      {isReplacing ? (
        <div className="flex items-start gap-3 rounded-lg bg-[#f3f4f6] p-4">
          <ArrowsClockwiseIcon
            className="mt-0.5 h-4 w-4 shrink-0 text-[#4f46e5]"
            weight="bold"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-[#111827]">Choose a replacement file</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Your current recording stays attached until the new upload is complete.
            </p>
          </div>
        </div>
      ) : null}
      <AudioDropzone selectedFile={selectedFile} disabled={isBusy} onSelect={resetSelection} />
      {selectedFile && ['uploading', 'confirming'].includes(uploadMutation.stage) ? (
        <UploadProgress
          {...uploadMutation.progress}
          fileName={selectedFile.name}
          label={
            uploadMutation.stage === 'confirming'
              ? 'Finalizing upload…'
              : `Uploading… ${uploadMutation.progress.percentage}%`
          }
        />
      ) : null}
      {uploadMutation.isError ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          <p className="font-semibold">
            {uploadMutation.failure === 'confirmation'
              ? "The recording was uploaded, but we couldn't finish saving it."
              : "We couldn't finish uploading the recording."}
          </p>
          <p className="mt-1">
            {uploadMutation.failure === 'confirmation'
              ? 'Please retry. The file will not be uploaded again.'
              : "Your meeting hasn't been lost. Retry the upload."}
          </p>
          <p className="sr-only">
            {getApiErrorMessage(uploadMutation.error, 'Unable to attach the recording.')}
          </p>
          <button
            type="button"
            onClick={uploadMutation.retry}
            disabled={isBusy}
            className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold transition hover:border-red-400 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-50"
          >
            {uploadMutation.failure === 'confirmation' ? 'Retry saving' : 'Retry upload'}
          </button>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-[#e5e7eb] pt-4 sm:flex-row sm:justify-end">
        {isReplacing ? (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setIsReplacing(false);
              uploadMutation.reset();
            }}
            disabled={isBusy}
            className="min-h-11 rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151] transition duration-200 hover:border-[#9ca3af] hover:bg-[#f9fafb] active:translate-y-px focus:outline-none focus:ring-4 focus:ring-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep current recording
          </button>
        ) : null}
        <button
          type="button"
          onClick={upload}
          disabled={!selectedFile || isBusy || uploadMutation.isError}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-5 text-sm font-semibold text-white transition duration-200 hover:bg-[#4338ca] active:translate-y-px focus:outline-none focus:ring-4 focus:ring-[#e0e7ff] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:opacity-100"
        >
          {isBusy ? (
            <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="bold" aria-hidden="true" />
          ) : (
            <UploadSimpleIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
          )}
          {actionLabel}
        </button>
        {uploadMutation.stage === 'uploading' ? (
          <button
            type="button"
            onClick={() => void uploadMutation.cancel()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:border-[#9ca3af] hover:bg-[#f9fafb] focus:outline-none focus:ring-4 focus:ring-[#e5e7eb]"
          >
            <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            Cancel upload
          </button>
        ) : null}
      </div>
    </div>
  );
}
