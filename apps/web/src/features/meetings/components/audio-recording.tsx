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
import { useDeleteMeetingAudio } from '../hooks/use-meetings';
import { AudioDropzone, formatFileSize } from './audio-dropzone';
import { AudioPlayer, type AudioSeekTarget } from './audio-player';
import { UploadProgress } from './upload-progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function AudioRecording({
  meeting,
  seekTarget,
  showPlayer = true,
}: Readonly<{ meeting: Meeting; seekTarget?: AudioSeekTarget | null; showPlayer?: boolean }>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const uploadMutation = useAudioUpload(meeting.id);
  const deleteMutation = useDeleteMeetingAudio(meeting.id);
  const hasRecording = Boolean(meeting.audioPath && meeting.audioFileName && meeting.fileSize);
  const processingLocked = ['QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'ANALYZING'].includes(
    meeting.status,
  );

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
      <div
        className={`rounded-lg border border-success/35 bg-success-surface ${showPlayer ? 'p-5' : 'p-4'}`}
      >
        <div
          className={
            showPlayer
              ? 'flex flex-col justify-between gap-4 sm:flex-row sm:items-center'
              : 'flex flex-col gap-4'
          }
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-popover text-success">
              <CheckCircleIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {meeting.audioFileName}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {formatFileSize(meeting.fileSize ?? 0)} / Upload complete
              </p>
            </div>
          </div>
          <div
            className={
              showPlayer
                ? 'flex flex-col gap-2 sm:flex-row'
                : 'grid grid-cols-2 gap-2 border-t border-success/35 pt-4'
            }
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={processingLocked}
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-success/35 bg-popover px-3 text-sm font-semibold text-foreground transition duration-200 hover:border-success/60 hover:bg-success-surface hover:text-success disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground ${showPlayer ? 'min-h-11' : 'h-9'}`}
                >
                  <ArrowsClockwiseIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
                  {processingLocked ? 'Processing recording' : 'Replace recording'}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Replace the recording?</AlertDialogTitle>
                <AlertDialogDescription>
                  Uploading a replacement will clear the current transcript and generated meeting
                  intelligence after the new file is safely stored.
                </AlertDialogDescription>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <AlertDialogCancel className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold">
                    Keep current recording
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => setIsReplacing(true)}
                    className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
                  >
                    Choose replacement
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={processingLocked || deleteMutation.isPending}
                  className={`whitespace-nowrap rounded-md px-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60 ${showPlayer ? 'min-h-11' : 'h-9 border border-transparent'}`}
                >
                  Delete recording
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Delete this recording?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the audio, transcript, summary, decisions, and action
                  items. The meeting record itself will remain.
                </AlertDialogDescription>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <AlertDialogCancel className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="min-h-11 rounded-lg bg-destructive px-5 text-sm font-semibold text-white"
                  >
                    Delete recording
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {showPlayer ? <AudioPlayer meetingId={meeting.id} seekTarget={seekTarget} /> : null}
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
        <div className="flex items-start gap-3 rounded-lg bg-muted p-4">
          <ArrowsClockwiseIcon
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            weight="bold"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">Choose a replacement file</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
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
          className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
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
            className="mt-3 min-h-11 rounded-lg border border-destructive/35 bg-popover px-4 font-semibold transition hover:border-destructive/50 hover:bg-destructive/15 focus:outline-none focus:ring-4 focus:ring-destructive/15 disabled:opacity-50"
          >
            {uploadMutation.failure === 'confirmation' ? 'Retry saving' : 'Retry upload'}
          </button>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        {isReplacing ? (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setIsReplacing(false);
              uploadMutation.reset();
            }}
            disabled={isBusy}
            className="min-h-11 rounded-lg border border-border bg-popover px-4 text-sm font-semibold text-muted-foreground transition duration-200 hover:border-input hover:bg-muted active:translate-y-px focus:outline-none focus:ring-4 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep current recording
          </button>
        ) : null}
        <button
          type="button"
          onClick={upload}
          disabled={!selectedFile || isBusy || uploadMutation.isError}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition duration-200 hover:bg-primary/90 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-popover px-4 text-sm font-semibold text-muted-foreground transition hover:border-input hover:bg-muted focus:outline-none focus:ring-4 focus:ring-ring/25"
          >
            <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            Cancel upload
          </button>
        ) : null}
      </div>
    </div>
  );
}
