'use client';

import type { MeetingListItem } from '@meeting-intelligence/types';
import { ArrowUpRightIcon, CalendarBlankIcon, ClockIcon, TrashIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeleteMeeting } from '../hooks/use-meetings';
import { MeetingStatusBadge } from './meeting-status-badge';

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function MeetingCard({
  meeting,
  index,
}: Readonly<{ meeting: MeetingListItem; index: number }>) {
  const deleteMutation = useDeleteMeeting();

  return (
    <article
      className="group rounded-lg border border-transparent transition duration-200 hover:border-[#dfe2ea] hover:bg-[#f9fafb] focus-within:border-[#c7d2fe] focus-within:bg-[#f9fafb]"
      role="listitem"
    >
      <div className="grid min-h-[82px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-4 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="hidden w-7 shrink-0 font-mono text-xs font-medium text-[#9ca3af] sm:block">
            {String(index).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <Link
              href={`/meetings/${meeting.id}`}
              className="inline-flex max-w-full items-center gap-2 rounded-md text-sm font-semibold text-[#111827] transition-colors hover:text-[#4338ca]"
            >
              <span className="truncate">{meeting.title}</span>
              <ArrowUpRightIcon
                className="h-3.5 w-3.5 shrink-0 text-[#6b7280] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                weight="bold"
                aria-hidden="true"
              />
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6b7280]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlankIcon className="h-3.5 w-3.5" weight="regular" aria-hidden="true" />
                {dateFormatter.format(new Date(meeting.createdAt))}
              </span>
              {meeting.duration ? (
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <ClockIcon className="h-3.5 w-3.5" weight="regular" aria-hidden="true" />
                  {Math.round(meeting.duration / 60)} min
                </span>
              ) : (
                <span className="font-mono text-[#9ca3af]">No duration</span>
              )}
            </div>
            {meeting.summaryPreview ? (
              <p className="mt-2 line-clamp-1 max-w-2xl text-sm text-[#4b5563]">
                {meeting.summaryPreview}
              </p>
            ) : null}
            {meeting.decisionCount > 0 || meeting.actionItemCount > 0 ? (
              <p className="mt-2 font-mono text-[11px] font-semibold text-[#4f46e5]">
                {meeting.decisionCount > 0
                  ? `${meeting.decisionCount} ${meeting.decisionCount === 1 ? 'decision' : 'decisions'}`
                  : null}
                {meeting.decisionCount > 0 && meeting.actionItemCount > 0 ? ' · ' : null}
                {meeting.actionItemCount > 0
                  ? `${meeting.actionItemCount} ${meeting.actionItemCount === 1 ? 'action item' : 'action items'}`
                  : null}
              </p>
            ) : null}
          </div>
        </div>

        <MeetingStatusBadge status={meeting.status} />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[#9ca3af] transition duration-200 hover:bg-red-50 hover:text-red-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Delete ${meeting.title}`}
            >
              <TrashIcon className="h-4 w-4" weight="regular" aria-hidden="true" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Delete meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              “{meeting.title}” and its recording, transcript, analysis, and share links will be
              permanently deleted.
            </AlertDialogDescription>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <AlertDialogCancel className="min-h-11 rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(meeting.id)}
                className="min-h-11 rounded-lg bg-[#b91c1c] px-4 text-sm font-semibold text-white"
              >
                Delete meeting
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  );
}
