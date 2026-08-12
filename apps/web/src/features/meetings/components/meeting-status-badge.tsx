import type { MeetingStatusValue } from '@meeting-intelligence/schemas';
import { cn } from '@/lib/utils';

const statusConfig = {
  UPLOADED: { label: 'Uploaded', className: 'bg-blue-100 text-blue-700' },
  QUEUED: { label: 'Queued', className: 'bg-amber-100 text-amber-700' },
  PREPROCESSING: { label: 'Preprocessing', className: 'bg-violet-100 text-violet-700' },
  TRANSCRIBING: { label: 'Transcribing', className: 'bg-purple-100 text-purple-700' },
  ANALYZING: { label: 'Analyzing', className: 'bg-indigo-100 text-indigo-700' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700' },
} satisfies Record<MeetingStatusValue, { label: string; className: string }>;

export function MeetingStatusBadge({ status }: Readonly<{ status: MeetingStatusValue }>) {
  const config = statusConfig[status];

  return (
    <span
      className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', config.className)}
    >
      {config.label}
    </span>
  );
}
