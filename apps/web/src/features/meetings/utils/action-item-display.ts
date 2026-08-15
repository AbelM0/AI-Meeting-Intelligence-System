import type { ActionItemPriorityValue } from '@meeting-intelligence/schemas';

export const actionItemPriorityDisplay: Record<
  ActionItemPriorityValue,
  { label: string; className: string }
> = {
  LOW: { label: 'Low', className: 'border-[#d1d5db] bg-[#f9fafb] text-[#4b5563]' },
  MEDIUM: { label: 'Medium', className: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]' },
  HIGH: { label: 'High', className: 'border-[#fcd34d] bg-[#fffbeb] text-[#92400e]' },
  URGENT: { label: 'Urgent', className: 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]' },
};
