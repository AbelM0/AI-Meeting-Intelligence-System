import type { MeetingStatusValue } from '@meeting-intelligence/schemas';
import { cn } from '@/lib/utils';

const statusConfig = {
  UPLOADED: {
    label: 'Uploaded',
    className: 'border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1]',
    active: false,
  },
  QUEUED: {
    label: 'Queued',
    className: 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]',
    active: true,
  },
  PREPROCESSING: {
    label: 'Preparing',
    className: 'border-[#a5f3fc] bg-[#ecfeff] text-[#0e7490]',
    active: true,
  },
  TRANSCRIBING: {
    label: 'Transcribing',
    className: 'border-[#a5f3fc] bg-[#ecfeff] text-[#0e7490]',
    active: true,
  },
  ANALYZING: {
    label: 'Analyzing',
    className: 'border-[#c7d2fe] bg-[#eef2ff] text-[#4338ca]',
    active: true,
  },
  COMPLETED: {
    label: 'Ready',
    className: 'border-[#bbf7d0] bg-[#f0fdf4] text-[#047857]',
    active: false,
  },
  FAILED: {
    label: 'Needs attention',
    className: 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]',
    active: false,
  },
} satisfies Record<MeetingStatusValue, { label: string; className: string; active: boolean }>;

export function MeetingStatusBadge({ status }: Readonly<{ status: MeetingStatusValue }>) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
        config.className,
      )}
    >
      {config.active ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse"
          aria-hidden="true"
        />
      ) : null}
      {config.label}
    </span>
  );
}
