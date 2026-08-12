'use client';

import { Activity, CalendarDays, CheckCircle2, Mic2, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeetings } from '../hooks/use-meetings';
import { CreateMeetingForm } from './create-meeting-form';
import { MeetingCard } from './meeting-card';

export function MeetingsDashboard() {
  const meetingsQuery = useMeetings();
  const [search, setSearch] = useState('');

  const meetings = meetingsQuery.data ?? [];
  const query = search.trim().toLowerCase();
  const filteredMeetings = query
    ? meetings.filter((meeting) => meeting.title.toLowerCase().includes(query))
    : meetings;

  const completedCount = meetings.filter((meeting) => meeting.status === 'COMPLETED').length;
  const activeCount = meetings.filter((meeting) =>
    ['QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'ANALYZING'].includes(meeting.status),
  ).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-indigo-100/70 via-violet-50/40 to-transparent" />
      <div className="pointer-events-none absolute -right-32 top-20 h-72 w-72 rounded-full bg-fuchsia-200/25 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-7">
        <nav className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5" aria-label="Primary navigation">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Mic2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-950">Meeting Intelligence</p>
              <p className="hidden text-xs text-slate-500 sm:block">Your AI-powered workspace</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Workspace ready
          </span>
        </nav>

        <header className="flex flex-col justify-between gap-5 pt-2 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Meeting workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Meetings</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Capture conversations, follow processing progress, and turn every meeting into useful intelligence.
            </p>
          </div>
          <CreateMeetingForm />
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Meeting summary">
          {[
            { label: 'Total meetings', value: meetings.length, icon: CalendarDays, tone: 'bg-indigo-50 text-indigo-600' },
            { label: 'In progress', value: activeCount, icon: Activity, tone: 'bg-amber-50 text-amber-600' },
            { label: 'Completed', value: completedCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <div><p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
            <div><h2 className="font-bold text-slate-950">All meetings</h2><p className="mt-1 text-sm text-slate-500">Review and manage your meeting library.</p></div>
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search meetings</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search meetings…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
            </label>
          </div>

          <div className="p-4 sm:p-6">

        {meetingsQuery.isPending ? (
          <div className="space-y-3" aria-label="Loading meetings">
            {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : meetingsQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
            {getApiErrorMessage(meetingsQuery.error, 'Unable to load meetings.')}
          </div>
        ) : meetings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm"><Mic2 className="h-6 w-6" aria-hidden="true" /></span>
            <h2 className="mt-5 text-lg font-bold text-slate-900">Your meeting library is ready</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Create your first meeting to begin organizing conversations and generating insights.</p>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="py-14 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" /><h2 className="mt-4 font-bold text-slate-800">No matching meetings</h2><p className="mt-1 text-sm text-slate-500">Try a different search term.</p></div>
        ) : (
          <section className="grid gap-4" aria-label="Meeting list">
            {filteredMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </section>
        )}
          </div>
        </section>
      </div>
    </main>
  );
}
