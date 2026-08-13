'use client';

import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  FileAudioIcon,
  HardDriveIcon,
  ShieldCheckIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeeting, useMeetingStatus } from '../hooks/use-meetings';
import { AudioRecording } from './audio-recording';
import { MeetingStatusBadge } from './meeting-status-badge';
import { MeetingProcessing } from './meeting-processing';

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const recordingRequirements = [
  { label: 'Accepted formats', value: 'MP3, WAV, M4A', Icon: FileAudioIcon },
  { label: 'Maximum size', value: '50 MB', Icon: HardDriveIcon },
  { label: 'Storage', value: 'Private bucket', Icon: ShieldCheckIcon },
];

export function MeetingDetails({ id }: Readonly<{ id: string }>) {
  const meetingQuery = useMeeting(id);
  const statusQuery = useMeetingStatus(id);

  if (meetingQuery.isPending) {
    return (
      <div className="space-y-4" aria-label="Loading meeting">
        <div className="h-6 w-36 animate-pulse rounded-lg bg-[#e5e7eb]" />
        <div className="h-40 animate-pulse rounded-lg bg-white" />
        <div className="h-72 animate-pulse rounded-lg bg-white" />
      </div>
    );
  }

  if (meetingQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800" role="alert">
        <div className="flex items-start gap-3">
          <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" weight="duotone" aria-hidden="true" />
          <div>
            <p className="font-semibold">Meeting unavailable</p>
            <p className="mt-1 text-sm leading-6">
              {getApiErrorMessage(
                meetingQuery.error,
                'Return to the meeting library and try again.',
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const meeting = meetingQuery.data;
  const currentMeeting = {
    ...meeting,
    status: statusQuery.data?.status ?? meeting.status,
  };

  return (
    <div>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-[#4b5563] transition hover:text-[#111827]"
      >
        <ArrowLeftIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
        Meeting library
      </Link>

      <header className="mt-4 border-b border-[#e5e7eb] pb-7">
        <div className="min-w-0">
          <h1 className="break-words text-[clamp(2.25rem,4vw,3.5rem)] font-medium leading-[1.06] tracking-[-0.035em] text-[#111827]">
            {meeting.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <MeetingStatusBadge status={currentMeeting.status} />
            <span className="inline-flex items-center gap-1.5 text-sm text-[#6b7280]">
              <CalendarBlankIcon className="h-4 w-4" weight="regular" aria-hidden="true" />
              Created {dateFormatter.format(new Date(meeting.createdAt))}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-[#4b5563]">
              <ShieldCheckIcon
                className="h-4 w-4 text-[#4f46e5]"
                weight="duotone"
                aria-hidden="true"
              />
              Private recording
            </span>
          </div>
        </div>
      </header>

      <section
        className="mt-7 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white"
        aria-labelledby="recording-title"
      >
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#4f46e5]">
              <FileAudioIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="recording-title"
                className="text-lg font-semibold tracking-[-0.02em] text-[#111827]"
              >
                Recording
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                One private source file for this meeting.
              </p>
            </div>
          </div>

          <dl
            className="mt-6 grid border-y border-[#e5e7eb] sm:grid-cols-3 sm:divide-x sm:divide-[#e5e7eb]"
            aria-label="Recording requirements"
          >
            {recordingRequirements.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 border-t border-[#e5e7eb] py-4 first:border-t-0 sm:border-t-0 sm:px-5 sm:first:pl-0 sm:last:pr-0"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-[#4f46e5]"
                  weight="duotone"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-[#111827]">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <AudioRecording meeting={currentMeeting} />
          </div>
        </div>
      </section>
      <MeetingProcessing meeting={currentMeeting} />
    </div>
  );
}
