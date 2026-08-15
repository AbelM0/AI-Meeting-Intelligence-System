'use client';

import type { MeetingStatusValue } from '@meeting-intelligence/schemas';
import type { TranscriptSegment } from '@meeting-intelligence/types';
import { MagnifyingGlassIcon, TextAlignLeftIcon, WarningIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetingTranscript } from '../hooks/use-meetings';
import { formatTimestamp } from '../utils/format-timestamp';

const activeStatuses: readonly MeetingStatusValue[] = [
  'QUEUED',
  'PREPROCESSING',
  'TRANSCRIBING',
  'ANALYZING',
];

function HighlightedText({ text, query }: Readonly<{ text: string; query: string }>) {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-[#cffafe] px-0.5 text-[#0e7490]">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function TranscriptRows({
  segments,
  query,
}: Readonly<{ segments: TranscriptSegment[]; query: string }>) {
  if (segments.length === 0) {
    return (
      <p className="rounded-lg bg-[#f9fafb] px-4 py-5 text-sm leading-6 text-[#4b5563]">
        No spoken content was detected in this recording.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-[#e5e7eb]" aria-label="Transcript segments">
      {segments.map((segment) => (
        <li
          id={`transcript-segment-${segment.id}`}
          key={segment.id}
          className="grid gap-2 py-5 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-6"
        >
          <time
            className="font-mono text-xs font-semibold tabular-nums text-[#4f46e5]"
            dateTime={`PT${Math.max(0, segment.startTime)}S`}
          >
            {formatTimestamp(segment.startTime)}
          </time>
          <p className="max-w-[72ch] text-[15px] leading-7 text-[#1f2937]">
            <HighlightedText text={segment.text} query={query} />
          </p>
        </li>
      ))}
    </ol>
  );
}

export function MeetingTranscript({
  meetingId,
  status,
  processingError,
  focusTimestamp,
}: Readonly<{
  meetingId: string;
  status: MeetingStatusValue;
  processingError?: string | null;
  focusTimestamp?: number | null;
}>) {
  const isCompleted = status === 'COMPLETED';
  const transcriptQuery = useMeetingTranscript(meetingId, isCompleted || status === 'FAILED');
  const [search, setSearch] = useState('');

  const transcript = transcriptQuery.data;
  const query = search.trim();

  useEffect(() => {
    if (focusTimestamp === null || focusTimestamp === undefined || !transcript) return;

    const target = transcript.segments.reduce<TranscriptSegment | null>((closest, segment) => {
      if (!closest) return segment;
      return Math.abs(segment.startTime - focusTimestamp) <
        Math.abs(closest.startTime - focusTimestamp)
        ? segment
        : closest;
    }, null);

    if (target) {
      document
        .getElementById(`transcript-segment-${target.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusTimestamp, transcript]);
  const visibleSegments = useMemo(() => {
    const displaySegments: TranscriptSegment[] = transcript?.segments.length
      ? transcript.segments
      : transcript?.fullText
        ? [
            {
              id: `${transcript.id}-full-text`,
              startTime: 0,
              endTime: transcript.duration ?? 0,
              text: transcript.fullText,
              confidence: null,
            },
          ]
        : [];

    if (!query) return displaySegments;
    const normalizedQuery = query.toLowerCase();
    return displaySegments.filter((segment) =>
      segment.text.toLowerCase().includes(normalizedQuery),
    );
  }, [query, transcript]);

  if (status === 'UPLOADED') return null;

  return (
    <section
      className="mt-7 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white"
      aria-labelledby="transcript-title"
    >
      <div className="border-b border-[#e5e7eb] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ecfeff] text-[#0e7490]">
              <TextAlignLeftIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="transcript-title"
                className="text-xl font-semibold tracking-[-0.02em] text-[#111827]"
              >
                Transcript
              </h2>
              <p className="mt-1 max-w-[60ch] text-sm leading-6 text-[#6b7280]">
                {isCompleted
                  ? 'A timestamped record of the conversation, saved with this meeting.'
                  : status === 'FAILED'
                    ? 'The transcript is shown when available, even if meeting intelligence failed.'
                    : 'Your meeting transcript will appear here when processing is complete.'}
              </p>
            </div>
          </div>

          {isCompleted && transcript ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
              <span>{transcript.segments.length} segments</span>
              {transcript.language ? <span>{transcript.language}</span> : null}
              {transcript.duration !== null ? (
                <span>{formatTimestamp(transcript.duration)}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {isCompleted && transcript ? (
          <label className="relative mt-6 block max-w-md">
            <span className="sr-only">Search transcript</span>
            <MagnifyingGlassIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
              weight="bold"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transcript"
              className="min-h-11 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] pl-10 pr-4 text-sm text-[#111827] outline-none transition duration-200 placeholder:text-[#6b7280] hover:border-[#9ca3af] focus:border-[#4f46e5] focus:bg-white focus:ring-4 focus:ring-[#e0e7ff]"
            />
          </label>
        ) : null}
      </div>

      <div
        className="max-h-[min(60vh,36rem)] overflow-y-auto overscroll-contain p-5 sm:p-7"
        role="region"
        aria-label="Transcript content"
        tabIndex={0}
      >
        {activeStatuses.includes(status) ? (
          <div className="rounded-lg border border-[#a5f3fc] bg-[#ecfeff] p-5" aria-live="polite">
            <p className="font-semibold text-[#164e63]">Creating transcript...</p>
            <p className="mt-1 text-sm leading-6 text-[#155e75]">
              Audio is being prepared and transcribed. This view will update when the transcript is
              ready.
            </p>
          </div>
        ) : transcriptQuery.isPending ? (
          <div className="space-y-5" aria-label="Loading transcript">
            {[1, 2, 3].map((item) => (
              <div key={item} className="grid gap-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-6">
                <div className="h-4 w-12 animate-pulse rounded bg-[#e5e7eb]" />
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-[#e5e7eb]" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-[#e5e7eb]" />
                </div>
              </div>
            ))}
          </div>
        ) : transcriptQuery.isError ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <WarningIcon
                className="mt-0.5 h-5 w-5 shrink-0"
                weight="duotone"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  {status === 'FAILED'
                    ? 'The transcript is not available yet.'
                    : 'The transcript could not be loaded.'}
                </p>
                <p className="mt-1 leading-6">
                  {getApiErrorMessage(
                    transcriptQuery.error,
                    processingError ?? 'Refresh and try again.',
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : transcript ? (
          <>
            {status === 'FAILED' ? (
              <div
                className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5 text-red-800"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <WarningIcon
                    className="mt-0.5 h-5 w-5 shrink-0"
                    weight="duotone"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">Meeting analysis failed</p>
                    <p className="mt-1 text-sm leading-6">
                      Your transcript was saved successfully, but meeting intelligence could not be
                      generated.
                      {processingError ? ` ${processingError}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {visibleSegments.length > 0 || !query ? (
              <TranscriptRows segments={visibleSegments} query={query} />
            ) : (
              <p className="rounded-lg bg-[#f9fafb] px-4 py-5 text-sm leading-6 text-[#4b5563]">
                No transcript segments match “{query}”.
              </p>
            )}
          </>
        ) : status === 'FAILED' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
            {processingError ?? 'Use Retry analysis above to try again.'}
          </div>
        ) : null}
      </div>
    </section>
  );
}
