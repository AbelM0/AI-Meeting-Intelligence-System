'use client';

import type { Meeting } from '@meeting-intelligence/types';
import { ArrowUpRight, CalendarDays, Clock3, Mic2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { useDeleteMeeting } from '../hooks/use-meetings';
import { MeetingStatusBadge } from './meeting-status-badge';

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function MeetingCard({ meeting }: Readonly<{ meeting: Meeting }>) {
  const deleteMutation = useDeleteMeeting();

  function handleDelete() {
    const confirmed = window.confirm(`Delete “${meeting.title}”? This cannot be undone.`);

    if (confirmed) {
      deleteMutation.mutate(meeting.id);
    }
  }

  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
            <Mic2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-3">
          <Link
            href={`/meetings/${meeting.id}`}
            className="flex items-center gap-2 truncate text-base font-bold text-slate-900 transition hover:text-indigo-700"
          >
            <span className="truncate">{meeting.title}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {dateFormatter.format(new Date(meeting.createdAt))}
            </span>
            {meeting.duration ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {Math.round(meeting.duration / 60)} min
              </span>
            ) : null}
            <MeetingStatusBadge status={meeting.status} />
          </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Delete ${meeting.title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {deleteMutation.isError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {getApiErrorMessage(deleteMutation.error, 'Unable to delete the meeting.')}
        </p>
      ) : null}
    </article>
  );
}
