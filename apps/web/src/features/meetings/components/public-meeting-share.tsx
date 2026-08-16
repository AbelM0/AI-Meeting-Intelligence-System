'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  LockKeyIcon,
  WarningCircleIcon,
  WaveformIcon,
} from '@phosphor-icons/react';
import { getPublicMeetingShare } from '../api/meetings';
import { formatTimestamp } from '../utils/format-timestamp';
import { actionItemPriorityDisplay } from '../utils/action-item-display';

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function PublicMeetingShareView({ token }: Readonly<{ token: string }>) {
  const query = useQuery({
    queryKey: ['public-meeting-share', token],
    queryFn: () => getPublicMeetingShare(token),
    retry: false,
  });

  if (query.isPending) {
    return (
      <main className="mx-auto min-h-[100dvh] max-w-5xl px-4 py-10 sm:px-6">
        <div className="h-40 animate-pulse rounded-lg bg-[#e5e7eb]" />
        <div className="mt-8 h-96 animate-pulse rounded-lg bg-[#e5e7eb]" />
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-6 py-16">
        <section className="w-full max-w-lg rounded-lg border border-[#e5e7eb] bg-white p-8 text-center">
          <WarningCircleIcon
            className="mx-auto h-8 w-8 text-[#b91c1c]"
            weight="duotone"
            aria-hidden="true"
          />
          <h1 className="mt-5 text-2xl font-semibold text-[#111827]">
            This shared meeting is no longer available.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#4b5563]">
            The link may have expired or been revoked by the meeting owner.
          </p>
        </section>
      </main>
    );
  }

  const meeting = query.data;
  return (
    <main className="mx-auto min-h-[100dvh] max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-[#e5e7eb] pb-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#4f46e5]">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2ff]">
            <WaveformIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
          </span>
          Auralis shared meeting
        </div>
        <h1 className="mt-6 break-words text-[clamp(2.25rem,6vw,4rem)] font-medium leading-[1.04] tracking-[-0.04em] text-[#111827]">
          {meeting.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#4b5563]">
          <span className="inline-flex items-center gap-2">
            <CalendarBlankIcon className="h-4 w-4" weight="regular" aria-hidden="true" />
            {dateFormatter.format(new Date(meeting.createdAt))}
          </span>
          {meeting.duration ? (
            <span className="inline-flex items-center gap-2">
              <ClockIcon className="h-4 w-4" weight="regular" aria-hidden="true" />
              {Math.round(meeting.duration / 60)} min
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <LockKeyIcon className="h-4 w-4" weight="duotone" aria-hidden="true" />
            Read-only · Audio excluded
          </span>
        </div>
      </header>

      {meeting.summary ? (
        <section className="py-9" aria-labelledby="shared-summary">
          <h2 id="shared-summary" className="text-2xl font-semibold text-[#111827]">
            Executive summary
          </h2>
          <p className="mt-4 max-w-[72ch] whitespace-pre-line text-base leading-8 text-[#374151]">
            {meeting.summary.overview}
          </p>
          <div className="mt-8 grid gap-7 border-t border-[#e5e7eb] pt-7 md:grid-cols-3">
            {[
              ['Key topics', meeting.summary.keyTopics],
              ['Outcomes', meeting.summary.outcomes],
              ['Unresolved issues', meeting.summary.unresolvedIssues],
            ].map(([title, items]) => (
              <section key={title as string}>
                <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4b5563]">
                  {(items as string[]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {meeting.decisions.length ? (
        <section className="border-t border-[#e5e7eb] py-9" aria-labelledby="shared-decisions">
          <h2 id="shared-decisions" className="text-xl font-semibold text-[#111827]">
            Decisions
          </h2>
          <ol className="mt-4 divide-y divide-[#e5e7eb]">
            {meeting.decisions.map((decision) => (
              <li key={decision.id} className="flex gap-3 py-5">
                <CheckCircleIcon
                  className="mt-1 h-5 w-5 shrink-0 text-[#047857]"
                  weight="duotone"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold leading-7 text-[#111827]">{decision.decision}</p>
                  {decision.context ? (
                    <p className="mt-1 text-sm leading-6 text-[#4b5563]">{decision.context}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {meeting.actionItems.length ? (
        <section className="border-t border-[#e5e7eb] py-9" aria-labelledby="shared-actions">
          <h2 id="shared-actions" className="text-xl font-semibold text-[#111827]">
            Action items
          </h2>
          <ol className="mt-4 divide-y divide-[#e5e7eb]">
            {meeting.actionItems.map((item) => {
              const priority = actionItemPriorityDisplay[item.priority];
              return (
                <li key={item.id} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-semibold leading-7 text-[#111827]">{item.task}</p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.className}`}
                    >
                      {priority.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#4b5563]">
                    {item.owner ?? 'Unassigned'} ·{' '}
                    {item.status === 'IN_PROGRESS'
                      ? 'In progress'
                      : item.status[0] + item.status.slice(1).toLowerCase()}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {meeting.transcript ? (
        <section className="border-t border-[#e5e7eb] py-9" aria-labelledby="shared-transcript">
          <h2 id="shared-transcript" className="text-xl font-semibold text-[#111827]">
            Transcript
          </h2>
          <ol className="mt-5 space-y-5">
            {meeting.transcript.segments.map((segment) => (
              <li
                key={segment.id}
                className="grid min-w-0 gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-4"
              >
                <span className="font-mono text-xs font-semibold text-[#4f46e5]">
                  {formatTimestamp(segment.startTime)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#6b7280]">
                    {segment.speaker?.name ?? segment.speaker?.label ?? 'Speaker'}
                  </p>
                  <p className="mt-1 break-words text-[15px] leading-7 text-[#374151]">
                    {segment.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
