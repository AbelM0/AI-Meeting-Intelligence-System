'use client';

import { useQuery } from '@tanstack/react-query';
import type { ActionItem, Decision, PublicMeetingShare } from '@meeting-intelligence/types';
import {
  CheckCircleIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
  WaveformIcon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPublicMeetingShare } from '../api/meetings';
import { actionItemPriorityDisplay } from '../utils/action-item-display';
import {
  findClosestTranscriptSegment,
  getSpeakerDisplayName,
  getSpeakerMarker,
  resolveActionOwnerDisplayName,
  segmentMatchesTranscriptSearch,
} from '../utils/meeting-display';
import { formatTimestamp } from '../utils/format-timestamp';

type ShareTab = 'overview' | 'transcript' | 'decisions' | 'actions';
type EvidenceReference = Pick<
  Decision,
  'sourceStartTime' | 'sourceSegmentId' | 'sourceSegment'
>;

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </h2>
  );
}

function EvidenceButton({
  item,
  onOpen,
}: Readonly<{
  item: EvidenceReference;
  onOpen: (item: EvidenceReference) => void;
}>) {
  const timestamp = item.sourceStartTime ?? item.sourceSegment?.startTime ?? null;
  if (timestamp === null && item.sourceSegmentId === null) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="inline-flex h-8 items-center gap-1 text-xs font-medium text-primary transition hover:text-[#3730a3]"
    >
      {timestamp === null ? 'View evidence' : formatTimestamp(timestamp)}{' '}
      <span aria-hidden="true">→</span>
    </button>
  );
}

function SharedOverview({
  meeting,
  onOpenDecision,
  onViewDecisions,
}: Readonly<{
  meeting: PublicMeetingShare;
  onOpenDecision: (item: EvidenceReference) => void;
  onViewDecisions: () => void;
}>) {
  const summary = meeting.summary;
  if (!summary) {
    return <p className="py-8 text-sm text-muted-foreground">No summary was shared for this meeting.</p>;
  }
  return (
    <div className="grid gap-3 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
      <div className="space-y-3">
        <section className="rounded-lg border bg-white p-4 sm:p-5">
          <SectionLabel>Summary</SectionLabel>
          <p className="mt-3 max-w-[72ch] whitespace-pre-line text-sm leading-6 text-[#374151]">
            {summary.overview}
          </p>
        </section>
        <section className="grid overflow-hidden rounded-lg border bg-white sm:grid-cols-2 sm:divide-x">
          <div className="p-4 sm:p-5">
            <SectionLabel>Outcomes</SectionLabel>
            {summary.outcomes.length ? (
              <ul className="mt-3 space-y-2">
                {summary.outcomes.map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <span className="text-emerald-700" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No outcomes identified.</p>
            )}
          </div>
          <div className="border-t p-4 sm:border-t-0 sm:p-5">
            <SectionLabel>Unresolved</SectionLabel>
            {summary.unresolvedIssues.length ? (
              <ul className="mt-3 space-y-2">
                {summary.unresolvedIssues.map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <span className="text-amber-600" aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No unresolved issues.</p>
            )}
          </div>
        </section>
      </div>
      <div className="space-y-3">
        <section className="rounded-lg border bg-white p-4">
          <SectionLabel>Key topics</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.keyTopics.length ? (
              summary.keyTopics.map((topic) => (
                <span key={topic} className="rounded-md border bg-muted/60 px-2 py-1 text-xs">
                  {topic}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No topics identified.</span>
            )}
          </div>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <SectionLabel>Key decisions</SectionLabel>
            <button type="button" onClick={onViewDecisions} className="text-xs font-medium text-primary">
              View all →
            </button>
          </div>
          {meeting.decisions.length ? (
            <ol className="mt-2 divide-y">
              {meeting.decisions.slice(0, 3).map((decision) => (
                <li key={decision.id} className="flex gap-3 py-3">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" weight="duotone" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{decision.decision}</p>
                    <EvidenceButton item={decision} onOpen={onOpenDecision} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No decisions identified.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function SharedTranscript({
  meeting,
  highlightedId,
}: Readonly<{ meeting: PublicMeetingShare; highlightedId: string | null }>) {
  const [search, setSearch] = useState('');
  const transcript = meeting.transcript;
  const query = search.trim();
  const segments = useMemo(
    () =>
      transcript
        ? query
          ? transcript.segments.filter((segment) => segmentMatchesTranscriptSearch(segment, query))
          : transcript.segments
        : [],
    [query, transcript],
  );

  if (!transcript) {
    return <p className="py-8 text-sm text-muted-foreground">No transcript was shared for this meeting.</p>;
  }

  return (
    <section className="py-5" aria-labelledby="shared-transcript-title">
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="shared-transcript-title" className="text-lg font-semibold tracking-[-0.02em]">
            Transcript
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A read-only, speaker-linked record of the conversation.
          </p>
        </div>
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search transcript</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="bold" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transcript..."
            className="h-9 w-full rounded-md border bg-white pl-9 pr-3 text-sm outline-none transition hover:border-[#9ca3af] focus:border-primary focus:ring-2 focus:ring-[#e0e7ff]"
          />
        </label>
      </div>
      {query ? (
        <p className="py-3 text-xs text-muted-foreground" aria-live="polite">
          {segments.length} {segments.length === 1 ? 'match' : 'matches'}
        </p>
      ) : null}
      {segments.length ? (
        <ol className="divide-y" aria-label="Shared transcript segments">
          {segments.map((segment) => {
            const speaker = segment.speaker;
            return (
              <li
                id={`shared-transcript-segment-${segment.id}`}
                key={segment.id}
                tabIndex={highlightedId === segment.id ? -1 : undefined}
                className={`grid grid-cols-[52px_minmax(0,1fr)] gap-3 px-1 py-4 outline-none transition-colors sm:grid-cols-[68px_minmax(0,1fr)] sm:gap-5 ${highlightedId === segment.id ? 'border-l-2 border-l-primary bg-[#eef2ff]' : ''}`}
              >
                <div className="space-y-2">
                  <time className="font-mono text-[11px] font-semibold text-primary" dateTime={`PT${Math.max(0, segment.startTime)}S`}>
                    {formatTimestamp(segment.startTime)}
                  </time>
                  {speaker ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c7d2fe] bg-[#eef2ff] font-mono text-[11px] font-semibold text-[#4338ca]" aria-hidden="true">
                      {getSpeakerMarker(speaker)}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{speaker ? getSpeakerDisplayName(speaker) : 'Unknown speaker'}</p>
                  <p className="mt-1 max-w-[72ch] break-words text-[15px] leading-7 text-[#374151]">{segment.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="py-8 text-sm text-muted-foreground">
          {query ? `No transcript segments match “${query}”.` : 'No spoken content was shared.'}
        </p>
      )}
    </section>
  );
}

function SharedDecisions({
  decisions,
  onOpen,
}: Readonly<{ decisions: Decision[]; onOpen: (decision: EvidenceReference) => void }>) {
  return (
    <section className="py-6" aria-labelledby="shared-decisions-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="shared-decisions-title" className="text-xl font-semibold tracking-[-0.02em]">Decisions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Decisions agreed during this meeting.</p>
        </div>
        <span className="text-xs text-muted-foreground">{decisions.length} decisions</span>
      </div>
      {decisions.length ? (
        <ol className="mt-5 divide-y rounded-lg border bg-white px-4 sm:px-5">
          {decisions.map((decision) => (
            <li key={decision.id} className="flex gap-3 py-4">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" weight="duotone" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium">{decision.decision}</h3>
                {decision.context ? <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{decision.context}</p> : null}
                {decision.evidence ? <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Evidence</summary><p className="mt-1 max-w-[72ch] leading-5">“{decision.evidence}”</p></details> : null}
                <EvidenceButton item={decision} onOpen={onOpen} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 border-t pt-5 text-sm text-muted-foreground">No decisions were identified in this meeting.</p>
      )}
    </section>
  );
}

function statusLabel(item: ActionItem): string {
  if (item.status === 'IN_PROGRESS') return 'In progress';
  return item.status[0] + item.status.slice(1).toLocaleLowerCase();
}

function SharedActionItems({
  meeting,
  onOpen,
}: Readonly<{ meeting: PublicMeetingShare; onOpen: (item: EvidenceReference) => void }>) {
  const speakers = meeting.transcript?.speakers ?? [];
  return (
    <section className="py-6" aria-labelledby="shared-actions-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="shared-actions-title" className="text-xl font-semibold tracking-[-0.02em]">Action items</h2>
          <p className="mt-1 text-sm text-muted-foreground">Read-only follow-up work from this meeting.</p>
        </div>
        <span className="text-xs text-muted-foreground">{meeting.actionItems.length} items</span>
      </div>
      {meeting.actionItems.length ? (
        <ol className="mt-5 divide-y rounded-lg border bg-white px-4 sm:px-5">
          {meeting.actionItems.map((item) => {
            const priority = actionItemPriorityDisplay[item.priority];
            return (
              <li key={item.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_110px_100px_74px_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.task}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{statusLabel(item)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{resolveActionOwnerDisplayName(item.owner, speakers)}</span>
                <span className="text-xs text-muted-foreground">{item.dueDate ?? 'No due date'}</span>
                <span className={`w-fit rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${priority.className}`}>{priority.label}</span>
                <EvidenceButton item={item} onOpen={onOpen} />
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-6 border-t pt-5 text-sm text-muted-foreground">No action items were identified in this meeting.</p>
      )}
    </section>
  );
}

export function PublicMeetingShareView({ token }: Readonly<{ token: string }>) {
  const query = useQuery({
    queryKey: ['public-meeting-share', token],
    queryFn: () => getPublicMeetingShare(token),
    retry: false,
  });
  const [activeTab, setActiveTab] = useState<ShareTab>('overview');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'transcript' || !highlightedId) return;
    const element = document.getElementById(`shared-transcript-segment-${highlightedId}`);
    if (!element) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
  }, [activeTab, highlightedId]);

  if (query.isPending) {
    return (
      <main className="mx-auto min-h-[100dvh] max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-28 animate-pulse rounded-lg bg-muted" />
        <div className="mt-5 h-10 animate-pulse rounded bg-muted" />
        <div className="mt-5 h-72 animate-pulse rounded-lg bg-muted" />
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-6 py-16">
        <section className="w-full max-w-lg rounded-lg border bg-white p-8 text-center">
          <WarningCircleIcon className="mx-auto h-8 w-8 text-red-700" weight="duotone" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-semibold">This shared meeting is no longer available.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">The link may have expired or been revoked by the meeting owner.</p>
        </section>
      </main>
    );
  }

  const meeting = query.data;
  const transcript = meeting.transcript;
  const metadata = [
    dateFormatter.format(new Date(meeting.createdAt)),
    meeting.duration ? `${Math.round(meeting.duration / 60)} min` : null,
    transcript?.language?.toLocaleUpperCase(),
    transcript ? `${transcript.speakers.length} ${transcript.speakers.length === 1 ? 'speaker' : 'speakers'}` : null,
  ].filter(Boolean).join(' · ');

  function openEvidence(item: EvidenceReference) {
    if (!transcript) return;
    const timestamp = item.sourceStartTime ?? item.sourceSegment?.startTime ?? null;
    const segment =
      (item.sourceSegmentId
        ? transcript.segments.find((candidate) => candidate.id === item.sourceSegmentId)
        : null) ??
      (timestamp === null ? null : findClosestTranscriptSegment(transcript.segments, timestamp));
    setHighlightedId(segment?.id ?? null);
    setActiveTab('transcript');
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#c7d2fe] bg-[#eef2ff]">
          <WaveformIcon className="h-4 w-4" weight="duotone" aria-hidden="true" />
        </span>
        Auralis shared meeting
      </div>
      <header className="mt-5 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-[-0.025em]">{meeting.title}</h1>
          <p className="mt-2 text-xs text-muted-foreground">{metadata}</p>
        </div>
        <span className="inline-flex h-8 w-fit items-center gap-2 rounded-md border bg-white px-3 text-xs font-medium text-muted-foreground">
          <LockKeyIcon className="h-4 w-4 text-primary" weight="duotone" aria-hidden="true" />
          Read-only · Audio excluded
        </span>
      </header>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ShareTab)} className="mt-5">
        <div className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-auto min-w-max justify-start gap-6 rounded-none bg-transparent p-0 text-muted-foreground">
            {[
              ['overview', 'Overview', null],
              ['transcript', 'Transcript', null],
              ['decisions', 'Decisions', meeting.decisions.length],
              ['actions', 'Action Items', meeting.actionItems.length],
            ].map(([value, label, count]) => (
              <TabsTrigger
                key={value as string}
                value={value as string}
                className="gap-2 rounded-none border-b-2 border-transparent px-1 py-3 text-sm shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {label}
                {typeof count === 'number' ? <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{count}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-0">
          <SharedOverview meeting={meeting} onOpenDecision={openEvidence} onViewDecisions={() => setActiveTab('decisions')} />
        </TabsContent>
        <TabsContent value="transcript" className="mt-0">
          <SharedTranscript meeting={meeting} highlightedId={highlightedId} />
        </TabsContent>
        <TabsContent value="decisions" className="mt-0">
          <SharedDecisions decisions={meeting.decisions} onOpen={openEvidence} />
        </TabsContent>
        <TabsContent value="actions" className="mt-0">
          <SharedActionItems meeting={meeting} onOpen={openEvidence} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
