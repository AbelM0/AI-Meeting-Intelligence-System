'use client';

import {
  AUDIO_ACCEPT,
  DEFAULT_MAX_AUDIO_FILE_SIZE_BYTES,
  DEFAULT_MAX_AUDIO_FILE_SIZE_MB,
  requestAudioUploadSchema,
} from '@meeting-intelligence/schemas';
import { FileAudioIcon, UploadSimpleIcon, WaveformIcon, XIcon } from '@phosphor-icons/react';
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
      <div className="rounded-lg border border-primary/30 bg-accent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-popover text-primary">
              <FileAudioIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{selectedFile.name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)} / {extension}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            disabled={disabled}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-popover hover:text-foreground active:translate-y-px disabled:opacity-50"
            aria-label="Remove selected recording"
          >
            <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border border-dashed p-5 transition duration-200 focus:outline-none focus:ring-4 focus:ring-ring/25 sm:p-6 ${
          isDragActive
            ? 'border-primary bg-accent'
            : 'border-border bg-muted hover:border-primary/40 hover:bg-accent'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-popover text-primary">
            {isDragActive ? (
              <UploadSimpleIcon className="h-5 w-5" weight="bold" aria-hidden="true" />
            ) : (
              <WaveformIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {isDragActive ? 'Drop the recording here' : 'Drop a recording here or browse files'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Choose one MP3, WAV, or M4A audio file.</p>
          </div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-right">
            Up to {DEFAULT_MAX_AUDIO_FILE_SIZE_MB} MB
          </span>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-sm font-medium text-destructive" role="alert">
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
