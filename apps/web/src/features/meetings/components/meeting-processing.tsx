'use client';

import type { Meeting, MeetingProcessingStatus } from '@meeting-intelligence/types';
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  CircleIcon,
  PlayIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  useMeetingStatus,
  useProcessMeeting,
  useReprocessMeeting,
  useRetryMeeting,
} from '../hooks/use-meetings';

const activeStatuses = ['QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'ANALYZING'] as const;

const steps = [
  { label: 'Recording uploaded' },
  { label: 'Preparing secure audio access' },
  { label: 'Creating transcript + identifying speakers' },
  { label: 'Analyzing discussion' },
  { label: 'Finding decisions' },
  { label: 'Extracting action items' },
] as const;

function ProcessingStep({
  label,
  state,
}: Readonly<{ label: string; state: 'complete' | 'current' | 'pending' | 'failed' }>) {
  const Icon =
    state === 'complete'
      ? CheckCircleIcon
      : state === 'failed'
        ? WarningCircleIcon
        : state === 'current'
          ? SpinnerGapIcon
          : CircleIcon;

  return (
    <li
      className={cn(
        'flex min-h-9 items-center gap-3 text-sm font-medium',
        state === 'pending' && 'text-muted-foreground',
        state === 'complete' && 'text-muted-foreground',
        state === 'current' && 'text-foreground',
        state === 'failed' && 'text-destructive',
      )}
      aria-current={state === 'current' ? 'step' : undefined}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          state === 'complete' && 'text-success',
          state === 'current' && 'text-primary motion-safe:animate-spin',
        )}
        weight={state === 'pending' ? 'regular' : 'duotone'}
        aria-hidden="true"
      />
      {label}
    </li>
  );
}

function getStepState(
  index: number,
  processing: MeetingProcessingStatus | null,
): 'complete' | 'current' | 'pending' | 'failed' {
  if (index === 0) return 'complete';
  if (processing?.status === 'COMPLETED') return 'complete';

  const stageIndex =
    processing?.currentStage === 'TRANSCRIBING'
      ? 2
      : processing?.currentStage === 'ANALYZING_SUMMARY'
        ? 3
        : processing?.currentStage === 'FINDING_DECISIONS'
          ? 4
          : processing?.currentStage === 'EXTRACTING_ACTION_ITEMS'
            ? 5
            : processing?.currentStage === 'PERSISTING_INTELLIGENCE' ||
                processing?.currentStage === 'COMPLETED'
              ? 6
              : 1;

  if (index < stageIndex) return 'complete';
  if (index > stageIndex) return 'pending';
  return processing?.status === 'FAILED' ? 'failed' : 'current';
}

export function MeetingProcessing({ meeting, compact = false }: Readonly<{ meeting: Meeting; compact?: boolean }>) {
  const statusQuery = useMeetingStatus(meeting.id);
  const processMutation = useProcessMeeting();
  const retryMutation = useRetryMeeting();
  const reprocessMutation = useReprocessMeeting();
  const status = statusQuery.data?.status ?? meeting.status;
  const processing = statusQuery.data?.processing ?? null;
  const progress = processing?.progress ?? 0;
  const isActive = activeStatuses.some((activeStatus) => activeStatus === status);
  const isPending =
    processMutation.isPending || retryMutation.isPending || reprocessMutation.isPending;

  if (!meeting.audioPath) return null;

  if (compact && status === 'COMPLETED') {
    return (
      <section className="mt-5 border-t pt-5" aria-labelledby="reprocess-title">
        <h3 id="reprocess-title" className="text-sm font-semibold text-foreground">
          Reprocess meeting
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Retranscribe this recording and replace its generated summary, decisions, and action
          items.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border bg-popover px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60"
            >
              <ArrowClockwiseIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
              {reprocessMutation.isPending ? 'Queueing…' : 'Reprocess from recording'}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Reprocess this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will retranscribe the recording and replace the generated summary, decisions,
              and action items. Your recording remains private.
            </AlertDialogDescription>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <AlertDialogCancel className="min-h-11 rounded-lg border border-border bg-popover px-4 text-sm font-semibold text-muted-foreground">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => reprocessMutation.mutate(meeting.id)}
                className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
              >
                Start reprocessing
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    );
  }

  return (
    <section
      className="mt-7 overflow-hidden rounded-lg border border-border bg-popover"
      aria-labelledby="processing-title"
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
        <div className="p-5 sm:p-7 lg:border-r lg:border-border">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h2
                id="processing-title"
                className="text-xl font-semibold tracking-[-0.02em] text-foreground"
              >
                {status === 'COMPLETED'
                  ? 'Meeting intelligence ready'
                  : status === 'FAILED'
                    ? 'Meeting analysis failed'
                    : 'Understanding your meeting'}
              </h2>
              <p className="mt-1 max-w-[65ch] text-sm leading-6 text-muted-foreground">
                {status === 'COMPLETED'
                  ? 'Your summary, decisions, action items, and timestamped transcript are ready to review.'
                  : status === 'FAILED'
                    ? 'Analysis stopped before completion. Your transcript remains available when it has already been created.'
                    : isActive
                      ? 'You can leave this page. Progress is saved as each stage completes.'
                      : 'Start the processing pipeline when you are ready.'}
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">
              {progress}%
            </span>
          </div>

          <div className="mt-7" aria-live="polite">
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Meeting processing progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className={cn(
                  'h-full rounded-full bg-primary transition-[width] duration-500',
                  status === 'FAILED' && 'bg-destructive',
                  status === 'COMPLETED' && 'bg-success',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{progress}% complete</p>
          </div>

          {processing?.error ? (
            <div
              className="mt-5 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              {processing.error}
            </div>
          ) : null}
          {status === 'UPLOADED' || status === 'FAILED' ? (
            <button
              type="button"
              onClick={() =>
                status === 'FAILED'
                  ? retryMutation.mutate(meeting.id)
                  : processMutation.mutate(meeting.id)
              }
              disabled={isPending || isActive}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition duration-200 hover:bg-primary/90 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              {isPending ? (
                <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="bold" aria-hidden="true" />
              ) : status === 'FAILED' ? (
                <ArrowClockwiseIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
              ) : (
                <PlayIcon className="h-4 w-4" weight="fill" aria-hidden="true" />
              )}
              {isPending
                ? status === 'FAILED'
                  ? 'Queueing retry…'
                  : 'Queueing meeting…'
                : status === 'FAILED'
                  ? 'Retry analysis'
                  : 'Process meeting'}
            </button>
          ) : null}
          {status === 'COMPLETED' || status === 'FAILED' ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={isPending || isActive}
                  className="mt-3 min-h-11 rounded-lg border border-border bg-popover px-4 text-sm font-semibold text-muted-foreground transition hover:border-input hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reprocess from recording
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Reprocess this meeting?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will retranscribe the recording and replace the generated summary, decisions,
                  and action items. Your recording remains private.
                </AlertDialogDescription>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <AlertDialogCancel className="min-h-11 rounded-lg border border-border bg-popover px-4 text-sm font-semibold text-muted-foreground">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => reprocessMutation.mutate(meeting.id)}
                    className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
                  >
                    Start reprocessing
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>

        <div className="border-t border-border bg-muted p-5 sm:p-7 lg:border-t-0">
          <ol className="space-y-2" aria-label="Processing stages">
            {steps.map((step, index) => (
              <ProcessingStep
                key={step.label}
                label={step.label}
                state={getStepState(index, processing)}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
