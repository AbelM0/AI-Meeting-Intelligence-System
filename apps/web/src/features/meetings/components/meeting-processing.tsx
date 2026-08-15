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
import { getApiErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useMeetingStatus, useProcessMeeting, useRetryMeeting } from '../hooks/use-meetings';

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
        state === 'pending' && 'text-[#9ca3af]',
        state === 'complete' && 'text-[#374151]',
        state === 'current' && 'text-[#111827]',
        state === 'failed' && 'text-[#b91c1c]',
      )}
      aria-current={state === 'current' ? 'step' : undefined}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          state === 'complete' && 'text-[#047857]',
          state === 'current' && 'text-[#4f46e5] motion-safe:animate-spin',
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

export function MeetingProcessing({ meeting }: Readonly<{ meeting: Meeting }>) {
  const statusQuery = useMeetingStatus(meeting.id);
  const processMutation = useProcessMeeting();
  const retryMutation = useRetryMeeting();
  const status = statusQuery.data?.status ?? meeting.status;
  const processing = statusQuery.data?.processing ?? null;
  const progress = processing?.progress ?? 0;
  const isActive = activeStatuses.some((activeStatus) => activeStatus === status);
  const isPending = processMutation.isPending || retryMutation.isPending;
  const actionError = processMutation.error ?? retryMutation.error;

  if (!meeting.audioPath) return null;

  return (
    <section
      className="mt-7 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white"
      aria-labelledby="processing-title"
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
        <div className="p-5 sm:p-7 lg:border-r lg:border-[#e5e7eb]">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h2
                id="processing-title"
                className="text-xl font-semibold tracking-[-0.02em] text-[#111827]"
              >
                {status === 'COMPLETED'
                  ? 'Meeting intelligence ready'
                  : status === 'FAILED'
                    ? 'Meeting analysis failed'
                    : 'Understanding your meeting'}
              </h2>
              <p className="mt-1 max-w-[65ch] text-sm leading-6 text-[#6b7280]">
                {status === 'COMPLETED'
                  ? 'Your summary, decisions, action items, and timestamped transcript are ready to review.'
                  : status === 'FAILED'
                    ? 'Analysis stopped before completion. Your transcript remains available when it has already been created.'
                    : isActive
                      ? 'You can leave this page. Progress is saved as each stage completes.'
                      : 'Start the processing pipeline when you are ready.'}
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs font-semibold text-[#4b5563]">
              {progress}%
            </span>
          </div>

          <div className="mt-7" aria-live="polite">
            <div
              className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]"
              role="progressbar"
              aria-label="Meeting processing progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className={cn(
                  'h-full rounded-full bg-[#4f46e5] transition-[width] duration-500',
                  status === 'FAILED' && 'bg-[#b91c1c]',
                  status === 'COMPLETED' && 'bg-[#047857]',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-xs text-[#6b7280]">{progress}% complete</p>
          </div>

          {processing?.error ? (
            <div
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              {processing.error}
            </div>
          ) : null}
          {actionError ? (
            <div
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              {getApiErrorMessage(actionError, 'Processing could not be started. Try again.')}
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
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-5 text-sm font-semibold text-white transition duration-200 hover:bg-[#4338ca] active:translate-y-px focus:outline-none focus:ring-4 focus:ring-[#e0e7ff] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#6b7280]"
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
        </div>

        <div className="border-t border-[#e5e7eb] bg-[#f8fafc] p-5 sm:p-7 lg:border-t-0">
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
