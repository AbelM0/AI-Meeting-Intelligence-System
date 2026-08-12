'use client';

import type { Meeting } from '@meeting-intelligence/types';
import { CheckCircle2, LoaderCircle, RefreshCw, Upload } from 'lucide-react';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAudioUpload } from '../hooks/use-meetings';
import { AudioDropzone, formatFileSize } from './audio-dropzone';

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

  if (hasRecording && !isReplacing) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
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
            <RefreshCw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Replace recording
          </button>
        </div>
      </div>
    );
  }

  const actionLabel =
    uploadMutation.stage === 'authorizing'
      ? 'Preparing secure upload…'
      : uploadMutation.stage === 'uploading'
        ? 'Uploading securely…'
        : uploadMutation.stage === 'confirming'
          ? 'Finalizing recording…'
          : 'Upload recording';

  return (
    <div className="space-y-4">
      {isReplacing ? (
        <div className="flex items-start gap-3 rounded-lg bg-[#f3f4f6] p-4">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-[#4f46e5]" strokeWidth={1.8} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#111827]">Choose a replacement file</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Your current recording stays attached until the new upload is complete.
            </p>
          </div>
        </div>
      ) : null}
      <AudioDropzone
        selectedFile={selectedFile}
        disabled={uploadMutation.isPending}
        onSelect={(file) => {
          uploadMutation.reset();
          setSelectedFile(file);
        }}
      />
      {uploadMutation.isPending ? (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]"
          aria-label="Upload in progress"
        >
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#06b6d4]" />
        </div>
      ) : null}
      {uploadMutation.isError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {getApiErrorMessage(
            uploadMutation.error,
            'Unable to attach the recording. Please retry.',
          )}
        </p>
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
            disabled={uploadMutation.isPending}
            className="min-h-11 rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151] transition duration-200 hover:border-[#9ca3af] hover:bg-[#f9fafb] active:translate-y-px focus:outline-none focus:ring-4 focus:ring-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep current recording
          </button>
        ) : null}
        <button
          type="button"
          onClick={upload}
          disabled={!selectedFile || uploadMutation.isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-5 text-sm font-semibold text-white transition duration-200 hover:bg-[#4338ca] active:translate-y-px focus:outline-none focus:ring-4 focus:ring-[#e0e7ff] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:opacity-100"
        >
          {uploadMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
