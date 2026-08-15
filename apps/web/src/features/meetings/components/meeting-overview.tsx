'use client';

import type { ActionItem, TranscriptSpeaker } from '@meeting-intelligence/types';
import { ArrowRightIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetingIntelligence, useUpdateActionItemStatus } from '../hooks/use-meetings';
import { actionItemPriorityDisplay } from '../utils/action-item-display';
import { resolveActionOwnerDisplayName, type EvidenceTarget } from '../utils/meeting-display';
import { formatTimestamp } from '../utils/format-timestamp';
import { ActionItemEditor } from './action-item-editor';

type NavigateToEvidence = (target: Omit<EvidenceTarget, 'requestId'>) => void;

function SummaryList({ title, items }: Readonly<{ title: string; items: string[] }>) {
  if (items.length === 0) return null;
  const id = `summary-${title.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-sm font-semibold text-[#111827]">
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-[15px] leading-7 text-[#4b5563]">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span
              className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#06b6d4]"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EvidenceLink({
  item,
  onViewTranscript,
}: Readonly<{
  item: {
    sourceStartTime: number | null;
    sourceSegmentId: string | null;
    sourceSegment: { startTime: number } | null;
  };
  onViewTranscript: NavigateToEvidence;
}>) {
  const timestamp = item.sourceStartTime ?? item.sourceSegment?.startTime ?? null;
  if (timestamp === null && item.sourceSegmentId === null) return null;
  return (
    <button
      type="button"
      onClick={() =>
        onViewTranscript({ sourceSegmentId: item.sourceSegmentId, sourceStartTime: timestamp })
      }
      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#4f46e5] transition hover:text-[#3730a3] focus:ring-4 focus:ring-[#e0e7ff]"
    >
      {timestamp !== null ? formatTimestamp(timestamp) : 'Evidence'} · View in transcript{' '}
      <ArrowRightIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
    </button>
  );
}

function ActionItemRow({
  actionItem,
  meetingId,
  speakers,
  onViewTranscript,
}: Readonly<{
  actionItem: ActionItem;
  meetingId: string;
  speakers: readonly TranscriptSpeaker[];
  onViewTranscript: NavigateToEvidence;
}>) {
  const mutation = useUpdateActionItemStatus(meetingId);
  const completed = actionItem.status === 'COMPLETED';
  const priority = actionItemPriorityDisplay[actionItem.priority];
  return (
    <li className="border-t border-[#e5e7eb] py-6 first:border-t-0">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={completed}
          disabled={mutation.isPending}
          onChange={() =>
            mutation.mutate({
              actionItemId: actionItem.id,
              status: completed ? 'OPEN' : 'COMPLETED',
            })
          }
          className="mt-1 h-5 w-5 shrink-0 rounded border-[#9ca3af] accent-[#4f46e5]"
          aria-label={`${completed ? 'Reopen' : 'Complete'} action item: ${actionItem.task}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h3
              className={`text-base font-semibold leading-7 ${completed ? 'text-[#6b7280] line-through' : 'text-[#111827]'}`}
            >
              {actionItem.task}
            </h3>
            <ActionItemEditor meetingId={meetingId} actionItem={actionItem} />
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3 sm:gap-5">
            <div>
              <dt className="text-xs font-medium text-[#6b7280]">Owner</dt>
              <dd className="mt-1 text-[#374151]">
                {resolveActionOwnerDisplayName(actionItem.owner, speakers)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#6b7280]">Due</dt>
              <dd className="mt-1 text-[#374151]">{actionItem.dueDate ?? 'No due date'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#6b7280]">Priority</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.className}`}
                >
                  {priority.label}
                </span>
              </dd>
            </div>
          </dl>
          {actionItem.evidence ? (
            <details className="mt-3 text-sm text-[#6b7280]">
              <summary className="cursor-pointer font-medium text-[#4b5563]">Evidence</summary>
              <p className="mt-2 max-w-[72ch] leading-6">“{actionItem.evidence}”</p>
            </details>
          ) : null}
          {mutation.isError ? (
            <p className="mt-2 text-sm text-[#b91c1c]" role="alert">
              {getApiErrorMessage(
                mutation.error,
                'Completion status could not be updated. The change was rolled back.',
              )}
            </p>
          ) : null}
          <EvidenceLink item={actionItem} onViewTranscript={onViewTranscript} />
        </div>
      </div>
    </li>
  );
}

export function MeetingOverview({
  meetingId,
  speakers,
  onViewTranscript,
}: Readonly<{
  meetingId: string;
  speakers: readonly TranscriptSpeaker[];
  onViewTranscript: NavigateToEvidence;
}>) {
  const query = useMeetingIntelligence(meetingId);
  if (query.isPending)
    return (
      <div className="mt-8 space-y-8" aria-label="Loading meeting intelligence">
        <div className="h-28 animate-pulse rounded-lg bg-[#e5e7eb]" />
        <div className="h-52 animate-pulse rounded-lg bg-[#e5e7eb]" />
      </div>
    );
  if (query.isError)
    return (
      <div
        id="meeting-overview-panel"
        role="tabpanel"
        aria-labelledby="meeting-overview-tab"
        className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5 text-red-800"
      >
        <div className="flex gap-3">
          <WarningCircleIcon
            className="mt-0.5 h-5 w-5 shrink-0"
            weight="duotone"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">Meeting analysis failed</p>
            <p className="mt-1 text-sm leading-6">
              Your transcript is still available.{' '}
              {getApiErrorMessage(
                query.error,
                'Retry analysis to generate the summary and actions.',
              )}
            </p>
          </div>
        </div>
      </div>
    );
  const intelligence = query.data;
  if (!intelligence) return null;
  const hasSummaryLists =
    intelligence.summary.keyTopics.length +
      intelligence.summary.outcomes.length +
      intelligence.summary.unresolvedIssues.length >
    0;
  return (
    <div
      id="meeting-overview-panel"
      role="tabpanel"
      aria-labelledby="meeting-overview-tab"
      className="mt-8 space-y-10"
    >
      <section aria-labelledby="overview-title">
        <h2
          id="overview-title"
          className="text-2xl font-semibold tracking-[-0.025em] text-[#111827]"
        >
          Executive summary
        </h2>
        <p className="mt-4 max-w-[72ch] whitespace-pre-line text-base leading-8 text-[#374151]">
          {intelligence.summary.overview}
        </p>
      </section>
      {hasSummaryLists ? (
        <div className="grid gap-8 border-t border-[#e5e7eb] pt-8 md:grid-cols-2">
          {intelligence.summary.keyTopics.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-[#111827]">Key topics</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {intelligence.summary.keyTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-[#d1d5db] bg-[#f9fafb] px-3 py-1.5 text-sm text-[#4b5563]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          <SummaryList title="Outcomes" items={intelligence.summary.outcomes} />
          <SummaryList title="Unresolved" items={intelligence.summary.unresolvedIssues} />
        </div>
      ) : null}
      {intelligence.decisions.length > 0 ? (
        <section className="border-t border-[#e5e7eb] pt-8" aria-labelledby="decisions-title">
          <div className="flex items-baseline justify-between">
            <h2 id="decisions-title" className="text-xl font-semibold text-[#111827]">
              Key decisions
            </h2>
            <span className="font-mono text-xs font-semibold text-[#6b7280]">
              {intelligence.decisions.length}
            </span>
          </div>
          <ol className="mt-3 divide-y divide-[#e5e7eb]">
            {intelligence.decisions.map((decision) => (
              <li key={decision.id} className="py-6">
                <div className="flex gap-3">
                  <CheckCircleIcon
                    className="mt-1 h-5 w-5 shrink-0 text-[#047857]"
                    weight="duotone"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-semibold leading-7 text-[#111827]">{decision.decision}</h3>
                    {decision.context || decision.evidence ? (
                      <details className="mt-2 text-sm text-[#4b5563]">
                        <summary className="cursor-pointer font-medium">
                          Context and evidence
                        </summary>
                        {decision.context ? (
                          <p className="mt-2 max-w-[72ch] leading-6">{decision.context}</p>
                        ) : null}
                        {decision.evidence ? (
                          <p className="mt-2 max-w-[72ch] leading-6">“{decision.evidence}”</p>
                        ) : null}
                      </details>
                    ) : null}
                    <EvidenceLink item={decision} onViewTranscript={onViewTranscript} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {intelligence.actionItems.length > 0 ? (
        <section className="border-t border-[#e5e7eb] pt-8" aria-labelledby="action-items-title">
          <div className="flex items-baseline justify-between">
            <h2 id="action-items-title" className="text-xl font-semibold text-[#111827]">
              Action items
            </h2>
            <span className="font-mono text-xs font-semibold text-[#6b7280]">
              {intelligence.actionItems.length}
            </span>
          </div>
          <ol className="mt-3">
            {intelligence.actionItems.map((item) => (
              <ActionItemRow
                key={item.id}
                actionItem={item}
                meetingId={meetingId}
                speakers={speakers}
                onViewTranscript={onViewTranscript}
              />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
