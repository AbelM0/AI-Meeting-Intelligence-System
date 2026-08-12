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
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {meeting.audioFileName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(meeting.fileSize ?? 0)} · Upload complete
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReplacing(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
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
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          aria-label="Upload in progress"
        >
          <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
        </div>
      ) : null}
      {uploadMutation.isError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          {getApiErrorMessage(
            uploadMutation.error,
            'Unable to attach the recording. Please retry.',
          )}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {isReplacing ? (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setIsReplacing(false);
              uploadMutation.reset();
            }}
            disabled={uploadMutation.isPending}
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Keep current recording
          </button>
        ) : null}
        <button
          type="button"
          onClick={upload}
          disabled={!selectedFile || uploadMutation.isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploadMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
