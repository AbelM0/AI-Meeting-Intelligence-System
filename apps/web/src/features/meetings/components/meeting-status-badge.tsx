import type { MeetingStatusValue } from '@meeting-intelligence/schemas';
import { cn } from '@/lib/utils';

const statusConfig = {
  UPLOADED: {
    label: 'Uploaded',
    className: 'border-info/35 bg-info-surface text-info',
    active: false,
  },
  QUEUED: {
    label: 'Queued',
    className: 'border-warning/40 bg-warning-surface text-warning',
    active: true,
  },
  PREPROCESSING: {
    label: 'Preparing',
    className: 'border-info/35 bg-info-surface text-info',
    active: true,
  },
  TRANSCRIBING: {
    label: 'Transcribing',
    className: 'border-info/35 bg-info-surface text-info',
    active: true,
  },
  ANALYZING: {
    label: 'Analyzing',
    className: 'border-primary/30 bg-accent text-primary',
    active: true,
  },
  COMPLETED: {
    label: 'Ready',
    className: 'border-success/35 bg-success-surface text-success',
    active: false,
  },
  FAILED: {
    label: 'Needs attention',
    className: 'border-destructive/25 bg-destructive/10 text-destructive',
    active: false,
  },
} satisfies Record<MeetingStatusValue, { label: string; className: string; active: boolean }>;

export function MeetingStatusBadge({ status }: Readonly<{ status: MeetingStatusValue }>) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium',
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
