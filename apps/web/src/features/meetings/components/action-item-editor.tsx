'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  actionItemPrioritySchema,
  actionItemStatusSchema,
  updateActionItemSchema,
  type UpdateActionItemInput,
} from '@meeting-intelligence/schemas';
import type { ActionItem } from '@meeting-intelligence/types';
import { PencilSimpleIcon, XIcon } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { useUpdateActionItem } from '../hooks/use-meetings';

export function ActionItemEditor({
  meetingId,
  actionItem,
}: Readonly<{ meetingId: string; actionItem: ActionItem }>) {
  const dialogId = `edit-action-dialog-${actionItem.id}`;
  const mutation = useUpdateActionItem(meetingId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateActionItemInput>({
    resolver: zodResolver(updateActionItemSchema),
    defaultValues: {
      task: actionItem.task,
      owner: actionItem.owner,
      dueDate: actionItem.dueDate,
      priority: actionItem.priority,
      status: actionItem.status,
    },
  });

  useEffect(() => {
    reset({
      task: actionItem.task,
      owner: actionItem.owner,
      dueDate: actionItem.dueDate,
      priority: actionItem.priority,
      status: actionItem.status,
    });
  }, [actionItem, reset]);

  async function submit(input: UpdateActionItemInput) {
    await mutation.mutateAsync({ actionItemId: actionItem.id, input });
    (document.getElementById(dialogId) as HTMLDialogElement | null)?.close();
  }

  const inputClassName =
    'mt-2 min-h-11 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-sm text-[#111827] outline-none transition hover:border-[#9ca3af] focus:border-[#4f46e5] focus:bg-white focus:ring-4 focus:ring-[#e0e7ff]';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          mutation.reset();
          (document.getElementById(dialogId) as HTMLDialogElement | null)?.showModal();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#4b5563] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
        aria-label={`Edit action item: ${actionItem.task}`}
      >
        <PencilSimpleIcon className="h-4 w-4" weight="bold" aria-hidden="true" /> Edit
      </button>
      <dialog
        id={dialogId}
        className="modal-surface w-[min(92vw,34rem)] rounded-lg border border-[#e5e7eb] bg-white p-0 text-[#111827] shadow-2xl backdrop:bg-[#111827]/45"
        aria-labelledby={`edit-action-${actionItem.id}`}
        onClose={() => mutation.reset()}
      >
        <form onSubmit={handleSubmit(submit)} className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] pb-5">
            <div>
              <h2
                id={`edit-action-${actionItem.id}`}
                className="text-xl font-semibold tracking-[-0.02em]"
              >
                Edit action item
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                Changes are saved as the authoritative task record.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                (document.getElementById(dialogId) as HTMLDialogElement | null)?.close()
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]"
              aria-label="Close action item editor"
            >
              <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-[#374151]">
              Task
              <textarea
                {...register('task')}
                rows={3}
                className={`${inputClassName} resize-y py-3`}
                aria-invalid={Boolean(errors.task)}
              />
              {errors.task ? (
                <span className="mt-1 block text-xs text-[#b91c1c]">{errors.task.message}</span>
              ) : null}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[#374151]">
                Owner
                <input
                  {...register('owner', { setValueAs: (value) => String(value).trim() || null })}
                  className={inputClassName}
                  placeholder="Unassigned"
                />
              </label>
              <label className="block text-sm font-semibold text-[#374151]">
                Due date
                <input
                  {...register('dueDate', { setValueAs: (value) => String(value).trim() || null })}
                  className={inputClassName}
                  placeholder="No due date"
                />
              </label>
              <label className="block text-sm font-semibold text-[#374151]">
                Priority
                <select {...register('priority')} className={inputClassName}>
                  {actionItemPrioritySchema.options.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority[0] + priority.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-[#374151]">
                Status
                <select {...register('status')} className={inputClassName}>
                  {actionItemStatusSchema.options.map((status) => (
                    <option key={status} value={status}>
                      {status === 'IN_PROGRESS'
                        ? 'In progress'
                        : status[0] + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {mutation.isError ? (
            <p className="mt-4 text-sm text-[#b91c1c]" role="alert">
              {getApiErrorMessage(mutation.error, 'The action item could not be saved.')}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3 border-t border-[#e5e7eb] pt-5">
            <button
              type="button"
              onClick={() =>
                (document.getElementById(dialogId) as HTMLDialogElement | null)?.close()
              }
              className="min-h-11 rounded-lg border border-[#d1d5db] px-4 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="min-h-11 rounded-lg bg-[#4f46e5] px-5 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-wait disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
