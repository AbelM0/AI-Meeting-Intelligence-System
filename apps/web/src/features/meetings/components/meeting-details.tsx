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
import { useRef, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeeting, useMeetingStatus, useMeetingTranscript } from '../hooks/use-meetings';
import type { EvidenceTarget } from '../utils/meeting-display';
import { AudioRecording } from './audio-recording';
import { MeetingStatusBadge } from './meeting-status-badge';
import { MeetingProcessing } from './meeting-processing';
import { MeetingOverview } from './meeting-overview';
import { MeetingTranscript } from './meeting-transcript';

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const recordingRequirements = [
  { label: 'Accepted formats', value: 'MP3, WAV, M4A', Icon: FileAudioIcon },
  { label: 'Maximum size', value: '50 MB', Icon: HardDriveIcon },
  { label: 'Storage', value: 'Private bucket', Icon: ShieldCheckIcon },
];

export function MeetingDetails({ id }: Readonly<{ id: string }>) {
  const meetingQuery = useMeeting(id);
  const statusQuery = useMeetingStatus(id);
  const currentStatus = statusQuery.data?.status ?? meetingQuery.data?.status;
  const transcriptQuery = useMeetingTranscript(id, currentStatus === 'COMPLETED');
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript'>('overview');
  const [focusTarget, setFocusTarget] = useState<EvidenceTarget | null>(null);
  const evidenceRequestId = useRef(0);

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
  const transcript = transcriptQuery.data;
  const language = transcript?.language ?? meeting.language;
  const metadata = [
    dateFormatter.format(new Date(meeting.createdAt)),
    meeting.duration ? `${Math.round(meeting.duration / 60)} min` : null,
    language ? language.toLocaleUpperCase() : null,
    transcript
      ? `${transcript.speakers.length} ${transcript.speakers.length === 1 ? 'speaker' : 'speakers'}`
      : null,
  ].filter(Boolean);

  return (
    <div>
      <Link
        href="/meetings"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-[#4b5563] transition hover:text-[#111827]"
      >
        <ArrowLeftIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
        Meetings
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
              {metadata.join(' · ')}
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
      {meeting.audioPath && currentMeeting.status === 'COMPLETED' ? (
        <section className="mt-10" aria-label="Meeting results">
          <div className="border-b border-[#e5e7eb]">
            <div className="flex gap-6" role="tablist" aria-label="Meeting sections">
              {(['overview', 'transcript'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`meeting-${tab}-tab`}
                  aria-controls={`meeting-${tab}-panel`}
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`min-h-12 border-b-2 px-1 text-sm font-semibold capitalize transition focus:outline-none focus:ring-4 focus:ring-[#e0e7ff] ${
                    activeTab === tab
                      ? 'border-[#4f46e5] text-[#111827]'
                      : 'border-transparent text-[#6b7280] hover:border-[#c7d2fe] hover:text-[#374151]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {activeTab === 'overview' ? (
            <MeetingOverview
              meetingId={meeting.id}
              speakers={transcript?.speakers ?? []}
              onViewTranscript={(target) => {
                evidenceRequestId.current += 1;
                setFocusTarget({ ...target, requestId: evidenceRequestId.current });
                setActiveTab('transcript');
              }}
            />
          ) : (
            <MeetingTranscript
              meetingId={meeting.id}
              status={currentMeeting.status}
              processingError={statusQuery.data?.processing?.error}
              focusTarget={focusTarget}
            />
          )}
        </section>
      ) : meeting.audioPath ? (
        <MeetingTranscript
          meetingId={meeting.id}
          status={currentMeeting.status}
          processingError={statusQuery.data?.processing?.error}
          focusTarget={focusTarget}
        />
      ) : null}
    </div>
  );
}
