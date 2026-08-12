'use client';

import {
  AUDIO_ACCEPT,
  DEFAULT_MAX_AUDIO_FILE_SIZE_BYTES,
  DEFAULT_MAX_AUDIO_FILE_SIZE_MB,
  requestAudioUploadSchema,
} from '@meeting-intelligence/schemas';
import { FileAudio, UploadCloud, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { type FileRejection, useDropzone } from 'react-dropzone';

type AudioDropzoneProps = {
  selectedFile: File | null;
  disabled?: boolean;
  onSelect: (file: File | null) => void;
};

function rejectionMessage(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  if (code === 'file-too-large') {
    return `The recording must be ${DEFAULT_MAX_AUDIO_FILE_SIZE_MB} MB or smaller.`;
  }
  if (code === 'too-many-files') return 'Choose one recording at a time.';
  return 'Choose an MP3, WAV, or M4A audio file.';
}

export function AudioDropzone({ selectedFile, disabled = false, onSelect }: AudioDropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDropAccepted = useCallback(
    ([file]: File[]) => {
      const result = requestAudioUploadSchema.safeParse({
        fileName: file?.name,
        mimeType: file?.type,
        fileSize: file?.size,
      });

      if (!file || !result.success) {
        setError(result.success ? 'Choose an audio file.' : result.error.issues[0]?.message);
        return;
      }

      setError(null);
      onSelect(file);
    },
    [onSelect],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    setError(rejections[0] ? rejectionMessage(rejections[0]) : 'Choose a valid audio file.');
  }, []);

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: AUDIO_ACCEPT,
    disabled,
    maxFiles: 1,
    maxSize: DEFAULT_MAX_AUDIO_FILE_SIZE_BYTES,
    multiple: false,
    onDropAccepted,
    onDropRejected,
  });

  if (selectedFile) {
    const extension = selectedFile.name.split('.').pop()?.toUpperCase();
    return (
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
              <FileAudio className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{selectedFile.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(selectedFile.size)} · {extension}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            disabled={disabled}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
            aria-label="Remove selected recording"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition focus:outline-none focus:ring-4 focus:ring-indigo-100 ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-200 bg-slate-50/70 hover:border-indigo-300 hover:bg-indigo-50/40'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-7 w-7 text-indigo-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-slate-900">
          {isDragActive ? 'Drop the recording here' : 'Upload meeting recording'}
        </p>
        <p className="mt-1 text-sm text-slate-500">Drop MP3, WAV, or M4A here, or browse files</p>
        <p className="mt-3 text-xs font-medium text-slate-400">
          Maximum {DEFAULT_MAX_AUDIO_FILE_SIZE_MB} MB · one file
        </p>
      </div>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
