'use client';

import type { MeetingListItem } from '@meeting-intelligence/types';
import { ArrowUpRightIcon, ArrowsClockwiseIcon, DotsThreeIcon, TrashIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDeleteMeeting, useRetryMeeting } from '../hooks/use-meetings';
import { MeetingStatusBadge } from './meeting-status-badge';

const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

export function MeetingCard({ meeting }: Readonly<{ meeting: MeetingListItem }>) {
  const deleteMutation = useDeleteMeeting();
  const retryMutation = useRetryMeeting();
  const counts = [meeting.decisionCount ? `${meeting.decisionCount} ${meeting.decisionCount === 1 ? 'decision' : 'decisions'}` : null, meeting.actionItemCount ? `${meeting.actionItemCount} ${meeting.actionItemCount === 1 ? 'action' : 'actions'}` : null].filter(Boolean).join(' · ');
  const metadata = [dateFormatter.format(new Date(meeting.createdAt)), meeting.duration ? `${Math.round(meeting.duration / 60)} min` : null, meeting.speakerCount ? `${meeting.speakerCount} ${meeting.speakerCount === 1 ? 'speaker' : 'speakers'}` : null].filter(Boolean).join(' · ');
  return (
    <article className="group relative flex min-w-0 flex-col rounded-xl border bg-popover transition-colors hover:border-primary/40 focus-within:border-primary/40" role="listitem">
      <Link href={`/meetings/${meeting.id}`} className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Open ${meeting.title}`} />
      <div className="pointer-events-none relative z-10 flex h-full min-h-64 flex-col p-5">
        <div className="flex min-h-11 items-center justify-between gap-3 pr-11">
          <MeetingStatusBadge status={meeting.status} />
        </div>
        <h3 className="mt-3 line-clamp-2 break-words text-base font-semibold leading-6 tracking-[-0.01em]">{meeting.title}</h3>
        <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-muted-foreground">
          {meeting.summaryPreview || (meeting.status === 'FAILED' ? 'Processing needs attention. Retry to continue.' : meeting.status === 'COMPLETED' ? 'Your meeting is ready to review.' : meeting.status === 'UPLOADED' ? 'Open this meeting to prepare your recording.' : 'Your recording is being processed.')}
        </p>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{metadata}</p>
        <div className="mt-auto pt-5">
          <div className="flex min-h-11 items-center justify-between gap-3 border-t pt-3">
            {meeting.status === 'FAILED' ? (
              <button type="button" onClick={() => retryMutation.mutate(meeting.id)} disabled={retryMutation.isPending} className="pointer-events-auto min-h-11 rounded-md border bg-popover px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60">{retryMutation.isPending ? 'Retrying…' : 'Retry analysis'}</button>
            ) : <p className="text-xs leading-5 text-muted-foreground">{counts || 'View meeting'}</p>}
            <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
          </div>
        </div>
        <div className="absolute right-4 top-5">
          <AlertDialog><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition hover:bg-popover hover:text-foreground" aria-label={`Actions for ${meeting.title}`}><DotsThreeIcon className="h-4 w-4" weight="bold" aria-hidden="true" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-40">{meeting.status === 'FAILED' ? <DropdownMenuItem onSelect={() => retryMutation.mutate(meeting.id)}><ArrowsClockwiseIcon className="h-4 w-4" aria-hidden="true" />Retry analysis</DropdownMenuItem> : null}<AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive"><TrashIcon className="h-4 w-4" aria-hidden="true" />Delete</DropdownMenuItem></AlertDialogTrigger></DropdownMenuContent></DropdownMenu><AlertDialogContent><AlertDialogTitle>Delete meeting?</AlertDialogTitle><AlertDialogDescription>“{meeting.title}” and its recording, transcript, analysis, and share links will be permanently deleted.</AlertDialogDescription><div className="mt-6 flex justify-end gap-3"><AlertDialogCancel className="h-9 rounded-md border px-4 text-sm font-medium">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(meeting.id)} className="h-9 rounded-md bg-red-700 px-4 text-sm font-medium text-white">Delete meeting</AlertDialogAction></div></AlertDialogContent></AlertDialog>
        </div>
      </div>
    </article>
  );
}
