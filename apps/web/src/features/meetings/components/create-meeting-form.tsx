'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createMeetingSchema, type CreateMeetingInput } from '@meeting-intelligence/schemas';
import { CalendarPlusIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#4338ca] active:translate-y-px focus:outline-none focus:ring-4 focus:ring-[#e0e7ff]"
      >
        <PlusIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
        New meeting
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/55 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !createMutation.isPending) setIsOpen(false);
      }}
    >
      <form
        onSubmit={onSubmit}
        className="modal-surface w-full rounded-t-2xl bg-white p-6 shadow-[0_28px_80px_-28px_rgba(17,24,39,0.45)] sm:max-w-lg sm:rounded-lg sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-meeting-title"
      >
        <div className="mb-7 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#c7d2fe] bg-[#eef2ff] text-[#4f46e5]">
              <CalendarPlusIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="create-meeting-title"
                className="text-xl font-semibold tracking-[-0.02em] text-[#111827]"
              >
                Create a meeting
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">
                Name the meeting now. Attach its private audio next.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={createMutation.isPending}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
            aria-label="Close create meeting form"
          >
            <XIcon className="h-5 w-5" weight="bold" aria-hidden="true" />
          </button>
        </div>
        <label htmlFor="meeting-title" className="mb-2 block text-sm font-semibold text-[#374151]">
          Meeting title
        </label>
        <input
          id="meeting-title"
          {...register('title')}
          autoFocus
          maxLength={200}
          placeholder="Weekly engineering sync"
          aria-invalid={Boolean(errors.title)}
          className="min-h-12 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-4 text-sm text-[#111827] outline-none transition duration-200 placeholder:text-[#6b7280] hover:border-[#9ca3af] focus:border-[#4f46e5] focus:bg-white focus:ring-4 focus:ring-[#e0e7ff]"
        />
        {errors.title ? (
          <p className="mt-2 text-sm font-medium text-red-700" role="alert">
            {errors.title.message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={createMutation.isPending}
            className="min-h-11 rounded-lg px-4 text-sm font-semibold text-[#4b5563] transition hover:bg-[#f3f4f6] active:translate-y-px disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#4f46e5] px-5 text-sm font-semibold text-white transition duration-200 hover:bg-[#4338ca] active:translate-y-px focus:outline-none focus:ring-4 focus:ring-[#e0e7ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creating…' : 'Create meeting'}
          </button>
        </div>
      </form>
    </div>
  );
}
