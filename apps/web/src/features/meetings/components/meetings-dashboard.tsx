'use client';

import {
  Activity,
  AudioLines,
  CheckCircle2,
  FileAudio2,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetings } from '../hooks/use-meetings';
import { CreateMeetingForm } from './create-meeting-form';
import { MeetingCard } from './meeting-card';

export function MeetingsDashboard() {
  const meetingsQuery = useMeetings();
  const [search, setSearch] = useState('');

  const meetings = meetingsQuery.data ?? [];
  const query = search.trim().toLowerCase();
  const filteredMeetings = query
    ? meetings.filter((meeting) => meeting.title.toLowerCase().includes(query))
    : meetings;

  const completedCount = meetings.filter((meeting) => meeting.status === 'COMPLETED').length;
  const activeCount = meetings.filter((meeting) =>
    ['QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'ANALYZING'].includes(meeting.status),
  ).length;
  const uploadedCount = meetings.filter((meeting) => meeting.status === 'UPLOADED').length;
  const failedCount = meetings.filter((meeting) => meeting.status === 'FAILED').length;

  const summary = [
    { label: 'Total', value: meetings.length, icon: FileAudio2 },
    { label: 'Ready', value: uploadedCount, icon: ShieldCheck },
    { label: 'Processing', value: activeCount, icon: Activity },
    { label: 'Completed', value: completedCount, icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
      <header className="grid gap-6 border-b border-[#e5e7eb] pb-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h1 className="max-w-3xl text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.04] tracking-[-0.04em] text-[#111827]">
            Meetings
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#4b5563]">
            Create a meeting, attach its private recording, and follow every processing state.
          </p>
        </div>
        <CreateMeetingForm />
      </header>

      <section
        className="grid grid-cols-2 border-b border-[#e5e7eb] sm:grid-cols-4"
        aria-label="Meeting summary"
      >
        {summary.map(({ label, value, icon: Icon }, index) => (
          <div
            key={label}
            className={`flex min-h-24 items-center gap-3 py-5 ${
              index % 2 === 0 ? 'pr-4' : 'border-l border-[#e5e7eb] pl-4'
            } sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-0`}
          >
            <Icon
              className="h-4 w-4 shrink-0 text-[#4f46e5]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <div>
              <p className="font-mono text-2xl font-medium tracking-[-0.03em] text-[#111827]">
                {value}
              </p>
              <p className="mt-1 text-xs font-medium text-[#6b7280]">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <section
          className="min-w-0 rounded-lg border border-[#e5e7eb] bg-white"
          aria-labelledby="meeting-library-title"
        >
          <div className="grid gap-4 border-b border-[#e5e7eb] p-4 sm:grid-cols-[1fr_minmax(240px,320px)] sm:items-center sm:p-5">
            <div>
              <h2
                id="meeting-library-title"
                className="text-lg font-semibold tracking-[-0.02em] text-[#111827]"
              >
                Meeting library
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                {meetings.length === 1
                  ? '1 meeting in this workspace'
                  : `${meetings.length} meetings in this workspace`}
              </p>
            </div>
            <label className="relative block w-full">
              <span className="sr-only">Search meetings</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search meetings"
                className="min-h-11 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] pl-10 pr-4 text-sm text-[#111827] outline-none transition duration-200 placeholder:text-[#6b7280] hover:border-[#9ca3af] focus:border-[#4f46e5] focus:bg-white focus:ring-4 focus:ring-[#e0e7ff]"
              />
            </label>
          </div>

          <div className="p-3 sm:p-4">
            {meetingsQuery.isPending ? (
              <div className="space-y-2" aria-label="Loading meetings">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-[88px] animate-pulse rounded-lg bg-[#f3f4f6]" />
                ))}
              </div>
            ) : meetingsQuery.isError ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <TriangleAlert
                    className="mt-0.5 h-5 w-5 shrink-0"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">Meeting library unavailable</p>
                    <p className="mt-1 leading-6">
                      {getApiErrorMessage(
                        meetingsQuery.error,
                        'Check the API connection and try again.',
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : meetings.length === 0 ? (
              <div className="grid min-h-80 place-items-center rounded-lg bg-[#f9fafb] px-6 py-14 text-center">
                <div>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-[#c7d2fe] bg-[#eef2ff] text-[#4f46e5]">
                    <AudioLines className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[#111827]">
                    Start with one conversation
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#4b5563]">
                    Create a meeting first. You can attach a private recording from its detail page.
                  </p>
                </div>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
                <div>
                  <Search
                    className="mx-auto h-6 w-6 text-[#9ca3af]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <h2 className="mt-4 font-semibold text-[#111827]">No matching meetings</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Try a shorter or different meeting title.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1" role="list" aria-label="Meeting list">
                {filteredMeetings.map((meeting, index) => (
                  <MeetingCard key={meeting.id} meeting={meeting} index={index + 1} />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6" aria-label="Workspace status">
          <section
            className="rounded-lg border border-[#e5e7eb] bg-white p-5"
            aria-labelledby="pipeline-title"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="pipeline-title" className="text-sm font-semibold text-[#111827]">
                Processing overview
              </h2>
              {failedCount > 0 ? (
                <span className="font-mono text-xs font-semibold text-red-700">
                  {failedCount} failed
                </span>
              ) : null}
            </div>
            <dl className="mt-4 space-y-3">
              {[
                ['Ready to process', uploadedCount],
                ['In progress', activeCount],
                ['Completed', completedCount],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-t border-[#e5e7eb] pt-3 first:border-t-0 first:pt-0"
                >
                  <dt className="text-sm text-[#4b5563]">{label}</dt>
                  <dd className="font-mono text-sm font-semibold text-[#111827]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
