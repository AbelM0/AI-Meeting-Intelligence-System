'use client';

import type { MeetingListItem } from '@meeting-intelligence/types';
import { ArrowsClockwiseIcon, DotsThreeIcon, TrashIcon } from '@phosphor-icons/react';
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
    <article className="group relative transition-colors hover:bg-muted/55 focus-within:bg-muted/55" role="listitem">
      <Link href={`/meetings/${meeting.id}`} className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Open ${meeting.title}`} />
      <div className="pointer-events-none relative z-10 grid min-h-[104px] gap-3 px-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-3">
        <div className="min-w-0"><div className="flex items-start justify-between gap-3 sm:justify-start"><h3 className="truncate text-sm font-semibold tracking-[-0.01em]">{meeting.title}</h3><MeetingStatusBadge status={meeting.status} /></div>{meeting.summaryPreview ? <p className="mt-1 line-clamp-1 max-w-3xl text-sm text-muted-foreground">{meeting.summaryPreview}</p> : <p className="mt-1 text-sm text-muted-foreground">{meeting.status === 'FAILED' ? 'Transcript available · Analysis needs attention' : 'Recording and meeting intelligence'}</p>}<p className="mt-2 text-xs text-muted-foreground">{metadata}</p></div>
        <div className="flex items-end justify-between gap-3 sm:justify-end">
          {meeting.status === 'FAILED' ? <button type="button" onClick={() => retryMutation.mutate(meeting.id)} disabled={retryMutation.isPending} className="pointer-events-auto h-8 rounded-md border bg-white px-3 text-xs font-medium transition hover:bg-muted disabled:opacity-60">{retryMutation.isPending ? 'Retrying…' : 'Retry analysis'}</button> : counts ? <p className="text-xs text-muted-foreground">{counts}</p> : <span />}
          <AlertDialog><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white hover:text-foreground" aria-label={`Actions for ${meeting.title}`}><DotsThreeIcon className="h-4 w-4" weight="bold" aria-hidden="true" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-40">{meeting.status === 'FAILED' ? <DropdownMenuItem onSelect={() => retryMutation.mutate(meeting.id)}><ArrowsClockwiseIcon className="h-4 w-4" aria-hidden="true" />Retry analysis</DropdownMenuItem> : null}<AlertDialogTrigger asChild><DropdownMenuItem className="text-red-700 focus:bg-red-50 focus:text-red-800"><TrashIcon className="h-4 w-4" aria-hidden="true" />Delete</DropdownMenuItem></AlertDialogTrigger></DropdownMenuContent></DropdownMenu><AlertDialogContent><AlertDialogTitle>Delete meeting?</AlertDialogTitle><AlertDialogDescription>“{meeting.title}” and its recording, transcript, analysis, and share links will be permanently deleted.</AlertDialogDescription><div className="mt-6 flex justify-end gap-3"><AlertDialogCancel className="h-9 rounded-md border px-4 text-sm font-medium">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(meeting.id)} className="h-9 rounded-md bg-red-700 px-4 text-sm font-medium text-white">Delete meeting</AlertDialogAction></div></AlertDialogContent></AlertDialog>
        </div>
      </div>
    </article>
  );
}
