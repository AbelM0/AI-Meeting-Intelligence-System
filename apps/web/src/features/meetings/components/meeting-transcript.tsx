'use client';

import type { MeetingStatusValue } from '@meeting-intelligence/schemas';
import type { TranscriptSegment, TranscriptSpeaker } from '@meeting-intelligence/types';
import {
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  TextAlignLeftIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetingTranscript, useUpdateMeetingSpeaker } from '../hooks/use-meetings';
import {
  findClosestTranscriptSegment,
  getSpeakerDisplayName,
  getSpeakerMarker,
  segmentMatchesTranscriptSearch,
  type EvidenceTarget,
} from '../utils/meeting-display';
import { formatTimestamp } from '../utils/format-timestamp';

const activeStatuses: readonly MeetingStatusValue[] = [
  'QUEUED',
  'PREPROCESSING',
  'TRANSCRIBING',
  'ANALYZING',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({ text, query }: Readonly<{ text: string; query: string }>) {
  if (!query) return text;
  return text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi')).map((part, index) =>
    part.toLocaleLowerCase() === query.toLocaleLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-[#cffafe] px-0.5 text-[#0e7490]">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function SpeakerManager({
  meetingId,
  speakers,
}: Readonly<{ meetingId: string; speakers: readonly TranscriptSpeaker[] }>) {
  const mutation = useUpdateMeetingSpeaker(meetingId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  if (speakers.length === 0) return null;

  function startEditing(speaker: TranscriptSpeaker) {
    mutation.reset();
    setEditingId(speaker.id);
    setName(speaker.name ?? '');
  }

  async function save(speaker: TranscriptSpeaker) {
    const normalizedName = name.trim();
    if (!normalizedName && !speaker.name) return;
    await mutation.mutateAsync({ speakerId: speaker.id, name: normalizedName || null });
    setEditingId(null);
  }

  return (
    <section
      className="border-b border-[#e5e7eb] px-5 py-5 sm:px-7"
      aria-labelledby="speakers-title"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="speakers-title" className="text-sm font-semibold text-[#111827]">
          Speakers
        </h3>
        <span className="font-mono text-xs text-[#6b7280]">{speakers.length}</span>
      </div>
      <ul className="mt-3 grid gap-2 lg:grid-cols-2">
        {speakers.map((speaker) => (
          <li
            key={speaker.id}
            className="flex min-h-12 items-center gap-3 rounded-lg bg-[#f9fafb] px-3"
          >
            <span
              className="flex h-8 min-w-8 items-center justify-center rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-1 font-mono text-xs font-semibold text-[#4338ca]"
              aria-hidden="true"
            >
              {getSpeakerMarker(speaker)}
            </span>
            {editingId === speaker.id ? (
              <>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Name for {speaker.label}</span>
                  <input
                    autoFocus
                    value={name}
                    maxLength={100}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void save(speaker);
                      }
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                    placeholder={speaker.label}
                    className="min-h-10 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-[#e0e7ff]"
                  />
                </label>
                <button
                  type="button"
                  disabled={mutation.isPending || (!name.trim() && !speaker.name)}
                  onClick={() => void save(speaker)}
                  className="min-h-10 rounded-lg px-3 text-xs font-semibold text-[#4f46e5] disabled:opacity-50"
                >
                  {mutation.isPending ? 'Saving' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6b7280] hover:bg-white"
                  aria-label={`Cancel renaming ${speaker.label}`}
                >
                  <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#111827]">
                    {getSpeakerDisplayName(speaker)}
                  </p>
                  {speaker.name ? <p className="text-xs text-[#6b7280]">{speaker.label}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => startEditing(speaker)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#4b5563] hover:bg-white hover:text-[#111827]"
                  aria-label={`${speaker.name ? 'Edit name for' : 'Rename'} ${getSpeakerDisplayName(speaker)}`}
                >
                  <PencilSimpleIcon className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
                  {speaker.name ? 'Edit' : 'Rename'}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {mutation.isError ? (
        <p className="mt-2 text-sm text-[#b91c1c]" role="alert">
          {getApiErrorMessage(mutation.error, 'The speaker name could not be saved.')}
        </p>
      ) : null}
    </section>
  );
}

function TranscriptRows({
  segments,
  query,
  highlightedId,
}: Readonly<{ segments: TranscriptSegment[]; query: string; highlightedId: string | null }>) {
  if (segments.length === 0)
    return (
      <p className="rounded-lg bg-[#f9fafb] px-4 py-5 text-sm leading-6 text-[#4b5563]">
        No spoken content was detected in this recording.
      </p>
    );
  return (
    <ol aria-label="Transcript segments">
      {segments.map((segment) => {
        const speakerName = segment.speaker ? getSpeakerDisplayName(segment.speaker) : null;
        const highlighted = segment.id === highlightedId;
        return (
          <li
            id={`transcript-segment-${segment.id}`}
            key={segment.id}
            tabIndex={highlighted ? -1 : undefined}
            className={`grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-t border-[#e5e7eb] px-1 py-5 outline-none transition-colors duration-500 first:border-t-0 sm:grid-cols-[68px_minmax(0,1fr)] sm:gap-5 ${highlighted ? 'border-l-2 border-l-[#4f46e5] bg-[#eef2ff]' : ''}`}
          >
            <div className="space-y-3">
              <time
                className="font-mono text-[11px] font-semibold text-[#4f46e5]"
                dateTime={`PT${Math.max(0, segment.startTime)}S`}
              >
                {formatTimestamp(segment.startTime)}
              </time>
              {segment.speaker ? (
                <span
                  className="flex h-9 min-w-9 w-fit items-center justify-center rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-1 font-mono text-xs font-semibold text-[#4338ca]"
                  aria-hidden="true"
                >
                  {getSpeakerMarker(segment.speaker)}
                </span>
              ) : null}
            </div>
            <div className="min-w-0">
              {speakerName ? (
                <p className="mb-1 text-sm font-semibold text-[#111827]">
                  <HighlightedText text={speakerName} query={query} />
                </p>
              ) : (
                <p className="mb-1 text-sm font-medium text-[#9ca3af]">Unknown speaker</p>
              )}
              <p className="max-w-[72ch] text-[15px] leading-7 text-[#1f2937]">
                <HighlightedText text={segment.text} query={query} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function MeetingTranscript({
  meetingId,
  status,
  processingError,
  focusTarget,
}: Readonly<{
  meetingId: string;
  status: MeetingStatusValue;
  processingError?: string | null;
  focusTarget?: EvidenceTarget | null;
}>) {
  const isCompleted = status === 'COMPLETED';
  const transcriptQuery = useMeetingTranscript(meetingId, isCompleted || status === 'FAILED');
  const [search, setSearch] = useState('');
  const transcript = transcriptQuery.data;
  const query = search.trim();

  const displaySegments = useMemo<TranscriptSegment[]>(
    () =>
      transcript?.segments.length
        ? transcript.segments
        : transcript?.fullText
          ? [
              {
                id: `${transcript.id}-full-text`,
                startTime: 0,
                endTime: transcript.duration ?? 0,
                text: transcript.fullText,
                confidence: null,
                speakerId: null,
                speaker: null,
              },
            ]
          : [],
    [transcript],
  );
  const visibleSegments = useMemo(
    () =>
      query
        ? displaySegments.filter((segment) => segmentMatchesTranscriptSearch(segment, query))
        : displaySegments,
    [displaySegments, query],
  );
  const focusedSegment = useMemo(() => {
    if (!focusTarget || !transcript) return null;
    const exact = focusTarget.sourceSegmentId
      ? (transcript.segments.find((segment) => segment.id === focusTarget.sourceSegmentId) ?? null)
      : null;
    return (
      exact ??
      (focusTarget.sourceStartTime !== null
        ? findClosestTranscriptSegment(transcript.segments, focusTarget.sourceStartTime)
        : null)
    );
  }, [focusTarget, transcript]);

  useEffect(() => {
    if (!focusedSegment) return;
    const element = document.getElementById(`transcript-segment-${focusedSegment.id}`);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    element?.focus({ preventScroll: true });
  }, [focusedSegment, focusTarget?.requestId]);

  if (status === 'UPLOADED') return null;
  return (
    <section
      id="meeting-transcript-panel"
      role="tabpanel"
      aria-labelledby="meeting-transcript-tab"
      className="mt-7 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white"
    >
      <div className="border-b border-[#e5e7eb] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ecfeff] text-[#0e7490]">
              <TextAlignLeftIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#111827]">
                Transcript
              </h2>
              <p className="mt-1 max-w-[60ch] text-sm leading-6 text-[#6b7280]">
                {isCompleted
                  ? 'A timestamped, speaker-linked record of the conversation.'
                  : status === 'FAILED'
                    ? 'The transcript remains available when meeting analysis fails.'
                    : 'Your transcript will appear when processing is complete.'}
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
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block w-full max-w-md">
              <span className="sr-only">Search transcript</span>
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                weight="bold"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transcript..."
                className="min-h-11 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] pl-10 pr-4 text-sm text-[#111827] outline-none transition hover:border-[#9ca3af] focus:border-[#4f46e5] focus:bg-white focus:ring-4 focus:ring-[#e0e7ff]"
              />
            </label>
            <span className="min-h-6 text-sm text-[#6b7280]" aria-live="polite">
              {query
                ? `${visibleSegments.length} ${visibleSegments.length === 1 ? 'match' : 'matches'}`
                : ''}
            </span>
          </div>
        ) : null}
      </div>
      {transcript ? <SpeakerManager meetingId={meetingId} speakers={transcript.speakers} /> : null}
      <div
        className="max-h-[min(65vh,44rem)] overflow-y-auto overscroll-contain p-4 sm:p-6"
        role="region"
        aria-label="Transcript content"
        tabIndex={0}
      >
        {activeStatuses.includes(status) ? (
          <div className="rounded-lg border border-[#a5f3fc] bg-[#ecfeff] p-5" aria-live="polite">
            <p className="font-semibold text-[#164e63]">
              Creating transcript and identifying speakers...
            </p>
            <p className="mt-1 text-sm leading-6 text-[#155e75]">
              This view will update when the transcript is ready.
            </p>
          </div>
        ) : transcriptQuery.isPending ? (
          <div className="space-y-5" aria-label="Loading transcript">
            {[1, 2, 3].map((item) => (
              <div key={item} className="grid grid-cols-[52px_1fr] gap-4">
                <div className="h-10 animate-pulse rounded bg-[#e5e7eb]" />
                <div className="h-16 animate-pulse rounded bg-[#e5e7eb]" />
              </div>
            ))}
          </div>
        ) : transcriptQuery.isError ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
            role="alert"
          >
            <div className="flex gap-3">
              <WarningIcon
                className="mt-0.5 h-5 w-5 shrink-0"
                weight="duotone"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">The transcript could not be loaded.</p>
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
                <p className="font-semibold">Meeting analysis failed</p>
                <p className="mt-1 text-sm leading-6">
                  Your transcript is available, but the summary and actions could not be generated.
                </p>
              </div>
            ) : null}
            {visibleSegments.length > 0 || !query ? (
              <TranscriptRows
                segments={visibleSegments}
                query={query}
                highlightedId={focusedSegment?.id ?? null}
              />
            ) : (
              <p className="rounded-lg bg-[#f9fafb] px-4 py-5 text-sm text-[#4b5563]">
                No transcript segments match “{query}”.
              </p>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
