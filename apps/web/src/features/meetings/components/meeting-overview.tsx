'use client';

import type { ActionItem, Decision, TranscriptSpeaker } from '@meeting-intelligence/types';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetingIntelligence, useUpdateActionItemStatus } from '../hooks/use-meetings';
import { actionItemPriorityDisplay } from '../utils/action-item-display';
import { resolveActionOwnerDisplayName, type EvidenceTarget } from '../utils/meeting-display';
import { formatTimestamp } from '../utils/format-timestamp';
import { ActionItemEditor } from './action-item-editor';

type NavigateToEvidence = (target: Omit<EvidenceTarget, 'requestId'>) => void;
type SharedProps = { meetingId: string; speakers: readonly TranscriptSpeaker[]; onViewTranscript: NavigateToEvidence };

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{children}</h2>;
}

function EvidenceLink({ item, onViewTranscript }: Readonly<{ item: Pick<Decision, 'sourceStartTime' | 'sourceSegmentId' | 'sourceSegment'>; onViewTranscript: NavigateToEvidence }>) {
  const timestamp = item.sourceStartTime ?? item.sourceSegment?.startTime ?? null;
  if (timestamp === null && item.sourceSegmentId === null) return null;
  return (
    <button type="button" onClick={() => onViewTranscript({ sourceSegmentId: item.sourceSegmentId, sourceStartTime: timestamp })} className="inline-flex h-8 items-center gap-1.5 text-xs font-medium text-primary transition hover:text-[#3730a3]">
      {timestamp !== null ? formatTimestamp(timestamp) : 'Evidence'} <span aria-hidden="true">→</span>
    </button>
  );
}

function IntelligenceState({ meetingId, children }: Readonly<{ meetingId: string; children: (data: NonNullable<ReturnType<typeof useMeetingIntelligence>['data']>) => React.ReactNode }>) {
  const query = useMeetingIntelligence(meetingId);
  if (query.isPending) return <div className="space-y-3 py-6" aria-label="Loading meeting intelligence"><div className="h-24 animate-pulse rounded-md bg-muted" /><div className="h-40 animate-pulse rounded-md bg-muted" /></div>;
  if (query.isError) return <div className="my-5 border border-red-200 bg-red-50 p-4 text-red-800" role="alert"><div className="flex gap-3"><WarningCircleIcon className="mt-0.5 h-5 w-5 shrink-0" weight="duotone" aria-hidden="true" /><div><p className="font-semibold">Meeting analysis unavailable</p><p className="mt-1 text-sm">{getApiErrorMessage(query.error, 'The transcript remains available. Retry analysis to regenerate these results.')}</p></div></div></div>;
  return query.data ? children(query.data) : null;
}

function DecisionPreviewRow({ decision, onViewTranscript, detailed = false }: Readonly<{ decision: Decision; onViewTranscript: NavigateToEvidence; detailed?: boolean }>) {
  return (
    <li className="flex gap-3 py-3">
      <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" weight="duotone" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-foreground">{decision.decision}</h3>
        {detailed && decision.context ? <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{decision.context}</p> : null}
        {detailed && decision.evidence ? <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Evidence</summary><p className="mt-1 max-w-[72ch] leading-5">“{decision.evidence}”</p></details> : null}
        <EvidenceLink item={decision} onViewTranscript={onViewTranscript} />
      </div>
    </li>
  );
}

function CompactActionRow({ item, meetingId, speakers, onViewTranscript, editable = false }: Readonly<{ item: ActionItem; meetingId: string; speakers: readonly TranscriptSpeaker[]; onViewTranscript: NavigateToEvidence; editable?: boolean }>) {
  const mutation = useUpdateActionItemStatus(meetingId);
  const completed = item.status === 'COMPLETED';
  const priority = actionItemPriorityDisplay[item.priority];
  const owner = resolveActionOwnerDisplayName(item.owner, speakers);

  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_110px_100px_74px_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-2">
        <input type="checkbox" checked={completed} disabled={mutation.isPending} onChange={() => mutation.mutate({ actionItemId: item.id, status: completed ? 'OPEN' : 'COMPLETED' })} className="mt-0.5 h-4 w-4 rounded border-[#9ca3af] accent-primary" aria-label={`${completed ? 'Reopen' : 'Complete'} action item: ${item.task}`} />
        <span className={`text-sm ${completed ? 'text-muted-foreground line-through' : 'font-medium'}`}>{item.task}</span>
      </div>
      <span className="pl-6 text-xs text-muted-foreground sm:pl-0">{owner}</span>
      <span className="pl-6 text-xs text-muted-foreground sm:pl-0">{item.dueDate ?? 'No due date'}</span>
      <span className={`ml-6 w-fit rounded-md border px-1.5 py-0.5 text-[10px] font-medium sm:ml-0 ${priority.className}`}>{priority.label}</span>
      <div className="flex items-center gap-1 pl-6 sm:pl-0"><EvidenceLink item={item} onViewTranscript={onViewTranscript} />{editable ? <ActionItemEditor meetingId={meetingId} actionItem={item} /> : null}</div>
    </li>
  );
}

export function MeetingOverview({ meetingId, onViewTranscript, onViewDecisions }: Readonly<SharedProps & { onViewDecisions: () => void }>) {
  return (
    <IntelligenceState meetingId={meetingId}>
      {(intelligence) => (
        <div className="grid gap-3 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <div className="space-y-3">
            <section className="rounded-lg border bg-white p-4 sm:p-5"><SectionLabel>Summary</SectionLabel><p className="mt-3 max-w-[72ch] whitespace-pre-line text-sm leading-6 text-[#374151]">{intelligence.summary.overview}</p></section>
            <section className="grid overflow-hidden rounded-lg border bg-white sm:grid-cols-2 sm:divide-x">
              <div className="p-4 sm:p-5"><SectionLabel>Outcomes</SectionLabel>{intelligence.summary.outcomes.length ? <ul className="mt-3 space-y-2">{intelligence.summary.outcomes.map((item) => <li key={item} className="flex gap-2 text-sm"><span className="text-emerald-700">✓</span><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No outcomes identified.</p>}</div>
              <div className="border-t p-4 sm:border-t-0 sm:p-5"><SectionLabel>Unresolved</SectionLabel>{intelligence.summary.unresolvedIssues.length ? <ul className="mt-3 space-y-2">{intelligence.summary.unresolvedIssues.map((item) => <li key={item} className="flex gap-2 text-sm"><span className="text-amber-600">•</span><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No unresolved issues.</p>}</div>
            </section>
          </div>
          <div className="space-y-3">
            <section className="rounded-lg border bg-white p-4"><SectionLabel>Key topics</SectionLabel><div className="mt-3 flex flex-wrap gap-2">{intelligence.summary.keyTopics.length ? intelligence.summary.keyTopics.map((topic) => <span key={topic} className="rounded-md border bg-muted/60 px-2 py-1 text-xs">{topic}</span>) : <span className="text-sm text-muted-foreground">No topics identified.</span>}</div></section>
            <section className="rounded-lg border bg-white p-4"><div className="flex items-center justify-between"><SectionLabel>Key decisions</SectionLabel><button type="button" onClick={onViewDecisions} className="text-xs font-medium text-primary">View all →</button></div>{intelligence.decisions.length ? <ol className="mt-2 divide-y">{intelligence.decisions.slice(0, 3).map((decision) => <DecisionPreviewRow key={decision.id} decision={decision} onViewTranscript={onViewTranscript} />)}</ol> : <p className="mt-3 text-sm text-muted-foreground">No decisions identified.</p>}</section>
          </div>
        </div>
      )}
    </IntelligenceState>
  );
}

export function MeetingDecisions({ meetingId, speakers, onViewTranscript }: Readonly<SharedProps>) {
  void speakers;
  return <IntelligenceState meetingId={meetingId}>{(intelligence) => <section className="py-6" aria-labelledby="decisions-title"><div className="flex items-end justify-between gap-4"><div><h2 id="decisions-title" className="text-xl font-semibold tracking-[-0.02em]">Decisions</h2><p className="mt-1 text-sm text-muted-foreground">Decisions agreed during this meeting.</p></div><span className="text-xs text-muted-foreground">{intelligence.decisions.length} decisions</span></div>{intelligence.decisions.length ? <ol className="mt-5 max-h-[min(62vh,42rem)] divide-y overflow-y-auto overscroll-contain rounded-lg border bg-white px-4 sm:px-5" role="region" aria-label="Meeting decisions" tabIndex={0}>{intelligence.decisions.map((decision) => <DecisionPreviewRow key={decision.id} decision={decision} onViewTranscript={onViewTranscript} detailed />)}</ol> : <p className="mt-6 border-t pt-5 text-sm text-muted-foreground">No decisions were identified in this meeting.</p>}</section>}</IntelligenceState>;
}

export function MeetingActionItems({ meetingId, speakers, onViewTranscript }: Readonly<SharedProps>) {
  return <IntelligenceState meetingId={meetingId}>{(intelligence) => <section className="py-6" aria-labelledby="actions-title"><div className="flex items-end justify-between gap-4"><div><h2 id="actions-title" className="text-xl font-semibold tracking-[-0.02em]">Action items</h2><p className="mt-1 text-sm text-muted-foreground">Owners, due dates and progress from this meeting.</p></div><span className="text-xs text-muted-foreground">{intelligence.actionItems.length} items</span></div>{intelligence.actionItems.length ? <ol className="mt-5 max-h-[min(62vh,42rem)] divide-y overflow-y-auto overscroll-contain rounded-lg border bg-white px-4 sm:px-5" role="region" aria-label="Meeting action items" tabIndex={0}>{intelligence.actionItems.map((item) => <CompactActionRow key={item.id} item={item} meetingId={meetingId} speakers={speakers} onViewTranscript={onViewTranscript} editable />)}</ol> : <p className="mt-6 border-t pt-5 text-sm text-muted-foreground">No action items were identified in this meeting.</p>}</section>}</IntelligenceState>;
}
