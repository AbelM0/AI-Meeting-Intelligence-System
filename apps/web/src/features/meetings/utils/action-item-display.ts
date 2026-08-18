import type { ActionItemPriorityValue } from '@meeting-intelligence/schemas';

export const actionItemPriorityDisplay: Record<
  ActionItemPriorityValue,
  { label: string; className: string }
> = {
  LOW: { label: 'Low', className: 'border-border bg-muted text-muted-foreground' },
  MEDIUM: { label: 'Medium', className: 'border-info/35 bg-info-surface text-info' },
  HIGH: { label: 'High', className: 'border-warning/40 bg-warning-surface text-warning' },
  URGENT: { label: 'Urgent', className: 'border-destructive/25 bg-destructive/10 text-destructive' },
};
