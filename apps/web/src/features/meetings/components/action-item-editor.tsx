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
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateActionItem } from '../hooks/use-meetings';

export function ActionItemEditor({
  meetingId,
  actionItem,
}: Readonly<{ meetingId: string; actionItem: ActionItem }>) {
  const dialogId = `edit-action-dialog-${actionItem.id}`;
  const [dialogElement, setDialogElement] = useState<HTMLDialogElement | null>(null);
  const mutation = useUpdateActionItem(meetingId);
  const {
    control,
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
    try {
      await mutation.mutateAsync({ actionItemId: actionItem.id, input });
      dialogElement?.close();
    } catch {
      // The mutation keeps the dialog open and shows the server-safe toast.
    }
  }

  const inputClassName =
    'mt-2 min-h-11 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none transition hover:border-input focus:border-primary focus:bg-popover focus:ring-4 focus:ring-ring/25';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          mutation.reset();
          dialogElement?.showModal();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label={`Edit action item: ${actionItem.task}`}
      >
        <PencilSimpleIcon className="h-4 w-4" weight="bold" aria-hidden="true" /> Edit
      </button>
      <dialog
        ref={setDialogElement}
        id={dialogId}
        className="modal-surface w-[min(92vw,34rem)] overflow-visible rounded-lg border border-border bg-popover p-0 text-foreground shadow-2xl backdrop:bg-[#111827]/45"
        aria-labelledby={`edit-action-${actionItem.id}`}
        onClose={() => mutation.reset()}
      >
        <form
          onSubmit={handleSubmit(submit)}
          className="max-h-[90dvh] overflow-y-auto rounded-lg p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <h2
                id={`edit-action-${actionItem.id}`}
                className="text-xl font-semibold tracking-[-0.02em]"
              >
                Edit action item
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Changes are saved as the authoritative task record.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogElement?.close()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Close action item editor"
            >
              <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-muted-foreground">
              Task
              <textarea
                {...register('task')}
                rows={3}
                className={`${inputClassName} resize-y py-3`}
                aria-invalid={Boolean(errors.task)}
              />
              {errors.task ? (
                <span className="mt-1 block text-xs text-destructive">{errors.task.message}</span>
              ) : null}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-muted-foreground">
                Owner
                <input
                  {...register('owner', { setValueAs: (value) => String(value).trim() || null })}
                  className={inputClassName}
                  placeholder="Unassigned"
                />
              </label>
              <label className="block text-sm font-semibold text-muted-foreground">
                Due date
                <input
                  {...register('dueDate', { setValueAs: (value) => String(value).trim() || null })}
                  className={inputClassName}
                  placeholder="No due date"
                />
              </label>
              <div className="block text-sm font-semibold text-muted-foreground">
                <span id={`priority-label-${actionItem.id}`}>Priority</span>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={`${inputClassName} shadow-none`}
                        aria-labelledby={`priority-label-${actionItem.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent portalContainer={dialogElement}>
                        {actionItemPrioritySchema.options.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority[0] + priority.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="block text-sm font-semibold text-muted-foreground">
                <span id={`status-label-${actionItem.id}`}>Status</span>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={`${inputClassName} shadow-none`}
                        aria-labelledby={`status-label-${actionItem.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent portalContainer={dialogElement}>
                        {actionItemStatusSchema.options.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === 'IN_PROGRESS'
                              ? 'In progress'
                              : status[0] + status.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={() => dialogElement?.close()}
              className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
