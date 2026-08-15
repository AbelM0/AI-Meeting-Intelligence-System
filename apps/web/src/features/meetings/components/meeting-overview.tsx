'use client';

import type { ActionItem, MeetingIntelligence } from '@meeting-intelligence/types';
import type { ActionItemPriorityValue } from '@meeting-intelligence/schemas';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetingIntelligence, useUpdateActionItemStatus } from '../hooks/use-meetings';
import { formatTimestamp } from '../utils/format-timestamp';

const priorityStyles: Record<ActionItemPriorityValue, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'border-[#d1d5db] bg-[#f9fafb] text-[#4b5563]' },
  MEDIUM: { label: 'Medium', className: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]' },
  HIGH: { label: 'High', className: 'border-[#fcd34d] bg-[#fffbeb] text-[#92400e]' },
  URGENT: { label: 'Urgent', className: 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]' },
};

const statusOptions: Array<{ value: ActionItem['status']; label: string }> = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

function SummarySection({ title, items }: Readonly<{ title: string; items: string[] }>) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={`summary-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <h3
        id={`summary-${title.toLowerCase().replaceAll(' ', '-')}`}
        className="text-sm font-semibold uppercase tracking-[0.08em] text-[#4b5563]"
      >
        {title}
      </h3>
      <ul className="mt-4 space-y-3 text-[15px] leading-7 text-[#374151]">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span
              className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#06b6d4]"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IntelligenceLoading() {
  return (
    <div className="mt-7 space-y-10" aria-label="Loading meeting intelligence">
      <div className="space-y-3">
        <div className="h-7 w-48 animate-pulse rounded bg-[#e5e7eb]" />
        <div className="h-4 w-full animate-pulse rounded bg-[#e5e7eb]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[#e5e7eb]" />
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded bg-[#e5e7eb]" />
        <div className="h-28 animate-pulse rounded bg-[#e5e7eb]" />
      </div>
    </div>
  );
}

function IntelligenceError({ error }: Readonly<{ error: unknown }>) {
  return (
    <div className="mt-7 rounded-lg border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
      <div className="flex items-start gap-3">
        <WarningCircleIcon
          className="mt-0.5 h-5 w-5 shrink-0"
          weight="duotone"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold">Meeting intelligence unavailable</p>
          <p className="mt-1 text-sm leading-6">
            {getApiErrorMessage(error, 'Refresh the page and try again.')}
          </p>
        </div>
      </div>
    </div>
  );
}

function DecisionList({
  decisions,
  onViewTranscript,
}: Readonly<{
  decisions: MeetingIntelligence['decisions'];
  onViewTranscript: (timestamp: number) => void;
}>) {
  if (decisions.length === 0) return null;

  return (
    <section className="border-t border-[#e5e7eb] pt-8" aria-labelledby="decisions-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="decisions-title"
          className="text-xl font-semibold tracking-[-0.02em] text-[#111827]"
        >
          Key decisions
        </h2>
        <span className="font-mono text-xs font-semibold text-[#6b7280]">
          {decisions.length} {decisions.length === 1 ? 'decision' : 'decisions'}
        </span>
      </div>
      <ol className="mt-2 divide-y divide-[#e5e7eb]">
        {decisions.map((decision) => (
          <li key={decision.id} className="py-6 first:pt-5 last:pb-0">
            <div className="flex items-start gap-3">
              <CheckCircleIcon
                className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]"
                weight="duotone"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold leading-7 text-[#111827]">
                  {decision.decision}
                </h3>
                {decision.context ? (
                  <p className="mt-2 max-w-[72ch] text-sm leading-6 text-[#4b5563]">
                    {decision.context}
                  </p>
                ) : null}
                <p className="mt-3 max-w-[72ch] text-sm leading-6 text-[#6b7280]">
                  Evidence: {decision.evidence}
                </p>
                {decision.sourceStartTime !== null ? (
                  <button
                    type="button"
                    onClick={() => onViewTranscript(decision.sourceStartTime as number)}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#4f46e5] transition hover:text-[#3730a3] focus:outline-none focus:ring-4 focus:ring-[#e0e7ff]"
                  >
                    {formatTimestamp(decision.sourceStartTime)} · View in transcript
                    <ArrowRightIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ActionItemRow({
  actionItem,
  meetingId,
  onViewTranscript,
}: Readonly<{
  actionItem: ActionItem;
  meetingId: string;
  onViewTranscript: (timestamp: number) => void;
}>) {
  const updateMutation = useUpdateActionItemStatus(meetingId);
  const priority = priorityStyles[actionItem.priority];
  const isCompleted = actionItem.status === 'COMPLETED';

  return (
    <li className="border-t border-[#e5e7eb] py-6 first:pt-5 last:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {isCompleted ? (
            <CheckCircleIcon
              className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]"
              weight="duotone"
              aria-hidden="true"
            />
          ) : (
            <CircleIcon
              className="mt-0.5 h-5 w-5 shrink-0 text-[#9ca3af]"
              weight="regular"
              aria-hidden="true"
            />
          )}
          <h3
            className={
              isCompleted
                ? 'text-[16px] font-semibold leading-7 text-[#6b7280] line-through'
                : 'text-[16px] font-semibold leading-7 text-[#111827]'
            }
          >
            {actionItem.task}
          </h3>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#4b5563]">
          <span className="sr-only">Update status for {actionItem.task}</span>
          <select
            value={actionItem.status}
            onChange={(event) =>
              updateMutation.mutate({
                actionItemId: actionItem.id,
                status: event.target.value as ActionItem['status'],
              })
            }
            disabled={updateMutation.isPending}
            className="min-h-11 rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[#9ca3af] focus:border-[#4f46e5] focus:ring-4 focus:ring-[#e0e7ff] disabled:cursor-wait disabled:bg-[#f9fafb]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pl-8 text-sm text-[#4b5563]">
        <span>{actionItem.owner ?? 'Unassigned'}</span>
        <span aria-hidden="true" className="text-[#9ca3af]">
          ·
        </span>
        <span>{actionItem.dueDate ?? 'No due date'}</span>
        <span aria-hidden="true" className="text-[#9ca3af]">
          ·
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.className}`}
        >
          {priority.label}
        </span>
      </div>

      <p className="mt-3 max-w-[72ch] pl-8 text-sm leading-6 text-[#6b7280]">
        Evidence: {actionItem.evidence}
      </p>
      {updateMutation.isError ? (
        <p className="mt-2 pl-8 text-sm text-[#b91c1c]" role="alert">
          {getApiErrorMessage(updateMutation.error, 'The status could not be updated.')}
        </p>
      ) : null}
      {actionItem.sourceStartTime !== null ? (
        <button
          type="button"
          onClick={() => onViewTranscript(actionItem.sourceStartTime as number)}
          className="mt-3 ml-8 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#4f46e5] transition hover:text-[#3730a3] focus:outline-none focus:ring-4 focus:ring-[#e0e7ff]"
        >
          {formatTimestamp(actionItem.sourceStartTime)} · View in transcript
          <ArrowRightIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

function ActionItemList({
  meetingId,
  actionItems,
  onViewTranscript,
}: Readonly<{
  meetingId: string;
  actionItems: MeetingIntelligence['actionItems'];
  onViewTranscript: (timestamp: number) => void;
}>) {
  if (actionItems.length === 0) return null;

  return (
    <section className="border-t border-[#e5e7eb] pt-8" aria-labelledby="action-items-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="action-items-title"
          className="text-xl font-semibold tracking-[-0.02em] text-[#111827]"
        >
          Action items
        </h2>
        <span className="font-mono text-xs font-semibold text-[#6b7280]">
          {actionItems.length} {actionItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <ol className="mt-2">
        {actionItems.map((actionItem) => (
          <ActionItemRow
            key={actionItem.id}
            actionItem={actionItem}
            meetingId={meetingId}
            onViewTranscript={onViewTranscript}
          />
        ))}
      </ol>
    </section>
  );
}

export function MeetingOverview({
  meetingId,
  onViewTranscript,
}: Readonly<{
  meetingId: string;
  onViewTranscript: (timestamp: number) => void;
}>) {
  const intelligenceQuery = useMeetingIntelligence(meetingId);

  if (intelligenceQuery.isPending) return <IntelligenceLoading />;
  if (intelligenceQuery.isError) return <IntelligenceError error={intelligenceQuery.error} />;

  const intelligence = intelligenceQuery.data;
  if (!intelligence) return null;

  return (
    <div className="mt-8 space-y-10" aria-labelledby="overview-title">
      <section>
        <h2
          id="overview-title"
          className="text-2xl font-semibold tracking-[-0.025em] text-[#111827]"
        >
          Executive summary
        </h2>
        <p className="mt-4 max-w-[72ch] whitespace-pre-line text-[16px] leading-8 text-[#374151]">
          {intelligence.summary.overview}
        </p>
      </section>

      <div className="grid gap-10 border-t border-[#e5e7eb] pt-8 sm:grid-cols-2">
        <SummarySection title="Key topics" items={intelligence.summary.keyTopics} />
        <SummarySection title="Outcomes" items={intelligence.summary.outcomes} />
        <SummarySection title="Unresolved" items={intelligence.summary.unresolvedIssues} />
      </div>

      <DecisionList decisions={intelligence.decisions} onViewTranscript={onViewTranscript} />
      <ActionItemList
        meetingId={meetingId}
        actionItems={intelligence.actionItems}
        onViewTranscript={onViewTranscript}
      />
    </div>
  );
}
