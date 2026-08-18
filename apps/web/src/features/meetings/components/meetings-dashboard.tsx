'use client';

import { MagnifyingGlassIcon, WarningIcon, WaveformIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetings } from '../hooks/use-meetings';
import { CreateMeetingForm } from './create-meeting-form';
import { MeetingCard } from './meeting-card';

type StatusFilter = 'ALL' | 'READY' | 'PROCESSING' | 'FAILED' | 'UPLOADED';
type SortOrder = 'NEWEST' | 'OLDEST';
const processingStatuses = ['QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'ANALYZING'];

export function MeetingsDashboard() {
  const meetingsQuery = useMeetings();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<SortOrder>('NEWEST');
  const meetings = useMemo(
    () => meetingsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [meetingsQuery.data],
  );
  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return meetings.filter((meeting) => {
      if (query && !`${meeting.title} ${meeting.summaryPreview ?? ''}`.toLocaleLowerCase().includes(query)) return false;
      if (status === 'READY') return meeting.status === 'COMPLETED';
      if (status === 'FAILED') return meeting.status === 'FAILED';
      if (status === 'UPLOADED') return meeting.status === 'UPLOADED';
      if (status === 'PROCESSING') return processingStatuses.includes(meeting.status);
      return true;
    }).sort((a, b) => {
      const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === 'NEWEST' ? difference : -difference;
    });
  }, [meetings, search, sort, status]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex items-start justify-between gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">Meetings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recordings, transcripts, decisions and follow-up work.</p>
        </div>
        <CreateMeetingForm />
      </header>
      <section className="mt-6" aria-labelledby="meeting-library-title">
        <h2 id="meeting-library-title" className="sr-only">Meeting library</h2>
        <div className="grid gap-2 border-b pb-4 sm:grid-cols-[minmax(240px,1fr)_160px_160px]">
          <label className="relative block">
            <span className="sr-only">Search meetings</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="bold" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search meetings..." className="h-9 w-full rounded-md border bg-popover pl-9 pr-3 text-sm outline-none transition hover:border-input focus:border-primary focus:ring-2 focus:ring-ring/25" />
          </label>
          <div>
            <span id="meeting-status-filter" className="sr-only">Meeting status</span>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="bg-popover shadow-none" aria-labelledby="meeting-status-filter"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All status</SelectItem><SelectItem value="READY">Ready</SelectItem><SelectItem value="PROCESSING">Processing</SelectItem><SelectItem value="FAILED">Failed</SelectItem><SelectItem value="UPLOADED">Uploaded</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <span id="meeting-sort" className="sr-only">Sort meetings</span>
            <Select value={sort} onValueChange={(value) => setSort(value as SortOrder)}>
              <SelectTrigger className="bg-popover shadow-none" aria-labelledby="meeting-sort"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="NEWEST">Newest first</SelectItem><SelectItem value="OLDEST">Oldest first</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        {meetingsQuery.isPending ? (
          <div className="divide-y" aria-label="Loading meetings">{[1, 2, 3, 4].map((item) => <div key={item} className="h-[104px] animate-pulse bg-muted/70" />)}</div>
        ) : meetingsQuery.isError ? (
          <div className="my-5 border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive" role="alert"><div className="flex items-start gap-3"><WarningIcon className="mt-0.5 h-5 w-5 shrink-0" weight="duotone" aria-hidden="true" /><div><p className="font-semibold">Meetings unavailable</p><p className="mt-1">{getApiErrorMessage(meetingsQuery.error, 'Check the API connection and try again.')}</p></div></div></div>
        ) : meetings.length === 0 ? (
          <div className="grid min-h-72 place-items-center border-b px-6 py-12 text-center"><div><WaveformIcon className="mx-auto h-6 w-6 text-primary" weight="duotone" aria-hidden="true" /><h2 className="mt-4 font-semibold">No meetings yet</h2><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Upload your first recording to turn it into a transcript, decisions and action items.</p></div></div>
        ) : filteredMeetings.length === 0 ? (
          <div className="grid min-h-56 place-items-center border-b px-6 py-10 text-center"><div><MagnifyingGlassIcon className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" /><h2 className="mt-3 font-semibold">No matching meetings</h2><p className="mt-1 text-sm text-muted-foreground">Adjust your search or status filter.</p></div></div>
        ) : (
          <div className="divide-y" role="list" aria-label="Meeting list">{filteredMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}</div>
        )}
        {meetingsQuery.hasNextPage && !search.trim() ? <div className="border-t pt-4 text-center"><button type="button" onClick={() => void meetingsQuery.fetchNextPage()} disabled={meetingsQuery.isFetchingNextPage} className="h-9 rounded-md border bg-popover px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-60">{meetingsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}</button></div> : null}
      </section>
    </div>
  );
}
