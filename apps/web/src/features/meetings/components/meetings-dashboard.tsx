'use client';

import { MagnifyingGlassIcon, WarningIcon, WaveformIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetings } from '../hooks/use-meetings';
import { CreateMeetingForm } from './create-meeting-form';
import { MeetingCard } from './meeting-card';

type StatusFilter = 'ALL' | 'READY' | 'PROCESSING' | 'FAILED' | 'UPLOADED';
type SortOrder = 'NEWEST' | 'OLDEST';
const PAGE_SIZE = 12;

export function MeetingsDashboard() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<SortOrder>('NEWEST');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const libraryHeading = useRef<HTMLHeadingElement>(null);
  const meetingsQuery = useMeetings({
    limit: PAGE_SIZE,
    cursor: cursors.at(-1),
    search: search.trim() || undefined,
    status,
    sort,
  });
  const meetings = meetingsQuery.data?.items ?? [];
  const hasFilters = Boolean(search.trim()) || status !== 'ALL';
  const page = cursors.length;

  // Deleting the last meeting on a page returns to the preceding page.
  if (meetingsQuery.isSuccess && meetings.length === 0 && page > 1) {
    setCursors(cursors.slice(0, -1));
  }

  function changePage(nextCursors: (string | undefined)[]) {
    setCursors(nextCursors);
    libraryHeading.current?.focus({ preventScroll: true });
    libraryHeading.current?.scrollIntoView({ block: 'start' });
  }

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
        <h2 ref={libraryHeading} tabIndex={-1} id="meeting-library-title" className="sr-only">Meeting library</h2>
        <div className="grid gap-2 border-b pb-4 sm:grid-cols-[minmax(240px,1fr)_160px_160px]">
          <label className="relative block">
            <span className="sr-only">Search meetings</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="bold" aria-hidden="true" />
            <input value={search} maxLength={200} onChange={(event) => { setSearch(event.target.value); setCursors([undefined]); }} placeholder="Search meetings..." className="h-9 w-full rounded-md border bg-popover pl-9 pr-3 text-sm outline-none transition hover:border-input focus:border-primary focus:ring-2 focus:ring-ring/25" />
          </label>
          <div>
            <span id="meeting-status-filter" className="sr-only">Meeting status</span>
            <Select value={status} onValueChange={(value) => { setStatus(value as StatusFilter); setCursors([undefined]); }}>
              <SelectTrigger className="bg-popover shadow-none" aria-labelledby="meeting-status-filter"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All status</SelectItem><SelectItem value="READY">Ready</SelectItem><SelectItem value="PROCESSING">Processing</SelectItem><SelectItem value="FAILED">Failed</SelectItem><SelectItem value="UPLOADED">Uploaded</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <span id="meeting-sort" className="sr-only">Sort meetings</span>
            <Select value={sort} onValueChange={(value) => { setSort(value as SortOrder); setCursors([undefined]); }}>
              <SelectTrigger className="bg-popover shadow-none" aria-labelledby="meeting-sort"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="NEWEST">Newest first</SelectItem><SelectItem value="OLDEST">Oldest first</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        {meetingsQuery.isPending ? (
          <div role="status" aria-label="Loading meetings">
            <span className="sr-only">Loading meetings…</span>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="flex min-h-64 flex-col rounded-xl border bg-popover p-5 motion-safe:animate-pulse">
                  <div className="flex justify-between"><div className="h-6 w-20 rounded bg-muted" /><div className="h-6 w-6 rounded bg-muted" /></div>
                  <div className="mt-5 h-5 w-3/4 rounded bg-muted" />
                  <div className="mt-3 h-4 w-full rounded bg-muted" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
                  <div className="mt-auto border-t pt-4"><div className="h-4 w-1/2 rounded bg-muted" /></div>
                </div>
              ))}
            </div>
          </div>
        ) : meetingsQuery.isError ? (
          <div className="my-5 border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive" role="alert"><div className="flex items-start gap-3"><WarningIcon className="mt-0.5 h-5 w-5 shrink-0" weight="duotone" aria-hidden="true" /><div><p className="font-semibold">Meetings unavailable</p><p className="mt-1">{getApiErrorMessage(meetingsQuery.error, 'Check the API connection and try again.')}</p><button type="button" onClick={() => void meetingsQuery.refetch()} disabled={meetingsQuery.isFetching} className="mt-3 min-h-11 rounded-md border border-destructive/30 px-4 font-medium disabled:opacity-50">{meetingsQuery.isFetching ? 'Retrying…' : 'Try again'}</button></div></div></div>
        ) : meetings.length === 0 && !hasFilters ? (
          <div className="grid min-h-72 place-items-center border-b px-6 py-12 text-center"><div><WaveformIcon className="mx-auto h-6 w-6 text-primary" weight="duotone" aria-hidden="true" /><h2 className="mt-4 font-semibold">No meetings yet</h2><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Upload your first recording to turn it into a transcript, decisions and action items.</p></div></div>
        ) : meetings.length === 0 ? (
          <div className="grid min-h-56 place-items-center border-b px-6 py-10 text-center"><div><MagnifyingGlassIcon className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" /><h2 className="mt-3 font-semibold">No matching meetings</h2><p className="mt-1 text-sm text-muted-foreground">Adjust your search or status filter.</p></div></div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Meetings">{meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}</div>
        )}
        {(page > 1 || meetingsQuery.data?.nextCursor || meetings.length > 0) && (
          <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4" aria-label="Meeting pagination">
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              Page {page}{meetingsQuery.isPending ? ' · Loading…' : meetings.length > 0 ? ` · ${meetings.length} ${meetings.length === 1 ? 'meeting' : 'meetings'}` : ''}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changePage(cursors.slice(0, -1))} disabled={page === 1} className="min-h-11 rounded-md border bg-popover px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
              <button type="button" onClick={() => { if (meetingsQuery.data?.nextCursor) changePage([...cursors, meetingsQuery.data.nextCursor]); }} disabled={!meetingsQuery.data?.nextCursor || meetingsQuery.isFetching || meetingsQuery.isError} className="min-h-11 rounded-md border bg-popover px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}
