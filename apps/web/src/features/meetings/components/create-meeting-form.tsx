'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createMeetingSchema, type CreateMeetingInput } from '@meeting-intelligence/schemas';
import { CalendarPlus, Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { useCreateMeeting } from '../hooks/use-meetings';

export function CreateMeetingForm() {
  const [isOpen, setIsOpen] = useState(false);
  const createMutation = useCreateMeeting();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMeetingInput>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: { title: '' },
  });

  const onSubmit = handleSubmit((input) => {
    createMutation.mutate(input, {
      onSuccess: () => {
        reset();
        setIsOpen(false);
      },
    });
  });

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !createMutation.isPending) {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [createMutation.isPending, isOpen]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New Meeting
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !createMutation.isPending) setIsOpen(false);
      }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full rounded-t-3xl border border-white/70 bg-white p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-meeting-title"
      >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="create-meeting-title" className="text-lg font-bold text-slate-950">Create a meeting</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Give your meeting a clear name. You can add audio next.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          disabled={createMutation.isPending}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
          aria-label="Close create meeting form"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <label htmlFor="meeting-title" className="mb-2 block text-sm font-semibold text-slate-700">
        Meeting title
      </label>
      <input
        id="meeting-title"
        {...register('title')}
        autoFocus
        maxLength={200}
        placeholder="e.g. Weekly engineering sync"
        aria-invalid={Boolean(errors.title)}
        className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
      />
      {errors.title ? (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {errors.title.message}
        </p>
      ) : null}
      {createMutation.isError ? (
        <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          {getApiErrorMessage(createMutation.error, 'Unable to create the meeting.')}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          disabled={createMutation.isPending}
          className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {createMutation.isPending ? 'Creating…' : 'Create meeting'}
        </button>
      </div>
      </form>
    </div>
  );
}
