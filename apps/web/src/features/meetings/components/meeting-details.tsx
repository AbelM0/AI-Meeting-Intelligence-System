'use client';

import { ArrowLeft, CalendarDays, FileAudio } from 'lucide-react';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeeting } from '../hooks/use-meetings';
import { MeetingStatusBadge } from './meeting-status-badge';

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function MeetingDetails({ id }: Readonly<{ id: string }>) {
  const meetingQuery = useMeeting(id);

  if (meetingQuery.isPending) {
    return <p className="text-zinc-500">Loading meeting…</p>;
  }

  if (meetingQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert">
        {getApiErrorMessage(meetingQuery.error, 'Unable to load the meeting.')}
      </div>
    );
  }

  const meeting = meetingQuery.data;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to meetings
      </Link>
      <article className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{meeting.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <MeetingStatusBadge status={meeting.status} />
              <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Created {dateFormatter.format(new Date(meeting.createdAt))}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-8 rounded-lg bg-zinc-50 p-5">
          <div className="flex items-center gap-3 text-zinc-700">
            <FileAudio className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Audio</p>
              <p className="text-sm text-zinc-500">Not uploaded yet</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
