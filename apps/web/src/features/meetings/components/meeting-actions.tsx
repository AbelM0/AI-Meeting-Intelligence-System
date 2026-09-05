'use client';

import type { ShareExpirationValue } from '@meeting-intelligence/schemas';
import {
  CopyIcon,
  DownloadSimpleIcon,
  LinkIcon,
  PrinterIcon,
  ExportIcon,
  ShareNetworkIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  useCreateMeetingShare,
  useMeetingIntelligence,
  useMeetingShares,
  useRevokeMeetingShare,
} from '../hooks/use-meetings';
import { NotionExportDialog } from './notion-export-dialog';

const expirationOptions: Array<{ value: ShareExpirationValue; label: string }> = [
  { value: '24_HOURS', label: '24 hours' },
  { value: '7_DAYS', label: '7 days' },
  { value: '30_DAYS', label: '30 days' },
  { value: 'NEVER', label: 'Never' },
];

export function MeetingActions({
  meetingId,
  meetingTitle,
  transcriptReady,
}: Readonly<{ meetingId: string; meetingTitle: string; transcriptReady: boolean }>) {
  const dialogId = `share-meeting-${meetingId}`;
  const [dialogElement, setDialogElement] = useState<HTMLDialogElement | null>(null);
  const intelligenceQuery = useMeetingIntelligence(meetingId, false);
  const sharesQuery = useMeetingShares(meetingId);
  const createShare = useCreateMeetingShare(meetingId);
  const revokeShare = useRevokeMeetingShare(meetingId);
  const [expiration, setExpiration] = useState<ShareExpirationValue>('7_DAYS');
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [notionOpen, setNotionOpen] = useState(false);
  const [oauthNotice, setOAuthNotice] = useState<
    'connected' | 'cancelled' | 'expired' | 'failed' | 'invalid_state' | null
  >(null);
  const activeShare = useMemo(
    () => sharesQuery.data?.find((share) => !share.revokedAt) ?? null,
    [sharesQuery.data],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const notice = url.searchParams.get('notion');
    if (!['connected', 'cancelled', 'expired', 'failed', 'invalid_state'].includes(notice ?? ''))
      return;
    url.searchParams.delete('notion');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    const timeout = window.setTimeout(() => {
      setOAuthNotice(notice as typeof oauthNotice);
      setNotionOpen(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function copyText(value: string, success: string, failure: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: success });
    } catch {
      toast({ variant: 'destructive', title: failure });
    }
  }

  function printReport() {
    const originalTitle = document.title;
    document.title = `${meetingTitle} - Meeting report`;
    window.addEventListener('afterprint', () => (document.title = originalTitle), { once: true });
    window.print();
  }

  function summaryText(): string | null {
    const intelligence = intelligenceQuery.data;
    if (!intelligence) return null;
    const sections = [
      intelligence.summary.overview,
      intelligence.summary.keyTopics.length
        ? `Key topics\n${intelligence.summary.keyTopics.map((item) => `- ${item}`).join('\n')}`
        : null,
      intelligence.summary.outcomes.length
        ? `Outcomes\n${intelligence.summary.outcomes.map((item) => `- ${item}`).join('\n')}`
        : null,
      intelligence.summary.unresolvedIssues.length
        ? `Unresolved issues\n${intelligence.summary.unresolvedIssues.map((item) => `- ${item}`).join('\n')}`
        : null,
    ];
    return sections.filter(Boolean).join('\n\n');
  }

  return (
    <div className="flex flex-wrap gap-2" data-no-print>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-popover px-4 text-sm font-semibold text-muted-foreground transition hover:border-input hover:bg-muted"
          >
            <DownloadSimpleIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            Export
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!intelligenceQuery.data || !transcriptReady}
            onSelect={printReport}
          >
            <PrinterIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            Print / Save PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!intelligenceQuery.data}
            onSelect={() => {
              const summary = summaryText();
              if (summary) {
                void copyText(
                  summary,
                  'Meeting summary copied.',
                  "We couldn't copy the meeting summary.",
                );
              }
            }}
          >
            <CopyIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            Copy meeting summary
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!intelligenceQuery.data?.actionItems.length}
            onSelect={() => setNotionOpen(true)}
          >
            <ExportIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            Export action items to Notion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NotionExportDialog
        meetingId={meetingId}
        actionItemCount={intelligenceQuery.data?.actionItems.length ?? 0}
        open={notionOpen}
        oauthNotice={oauthNotice}
        onClose={() => {
          setNotionOpen(false);
          setOAuthNotice(null);
        }}
      />

      <button
        type="button"
        onClick={() => dialogElement?.showModal()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
      >
        <ShareNetworkIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
        Share
      </button>

      <dialog
        ref={setDialogElement}
        id={dialogId}
        className="modal-surface w-[min(92vw,34rem)] overflow-visible rounded-lg bg-popover p-0 text-foreground shadow-2xl backdrop:bg-[#111827]/45"
        aria-labelledby={`${dialogId}-title`}
      >
        <div className="max-h-[90dvh] overflow-y-auto rounded-lg p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <h2 id={`${dialogId}-title`} className="text-xl font-semibold tracking-[-0.02em]">
                Share meeting
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Anyone with the link can read approved meeting content. Audio is never shared.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogElement?.close()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Close share meeting dialog"
            >
              <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
            </button>
          </div>

          {sharesQuery.isError ? (
            <div
              className="mt-5 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              {getApiErrorMessage(sharesQuery.error, 'Share settings are unavailable. Try again.')}
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div>
                <span
                  id={`${dialogId}-expiration`}
                  className="text-sm font-semibold text-muted-foreground"
                >
                  Expires
                </span>
                <Select
                  value={expiration}
                  onValueChange={(value) => setExpiration(value as ShareExpirationValue)}
                >
                  <SelectTrigger
                    className="mt-2 min-h-11 border-border bg-muted shadow-none"
                    aria-labelledby={`${dialogId}-expiration`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent portalContainer={dialogElement}>
                    {expirationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {createdUrl ? (
                <div className="rounded-lg bg-accent p-4">
                  <p className="break-all font-mono text-xs leading-5 text-primary">{createdUrl}</p>
                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        createdUrl,
                        'Share link copied.',
                        "We couldn't copy the share link.",
                      )
                    }
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-popover px-4 text-sm font-semibold text-primary"
                  >
                    <LinkIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
                    Copy link
                  </button>
                </div>
              ) : activeShare ? (
                <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
                  An active share exists. Create a new link to replace it, or revoke the current
                  link. Existing token values are intentionally not stored.
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
                {activeShare ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="min-h-11 rounded-lg px-4 text-sm font-semibold text-destructive hover:bg-destructive/10"
                      >
                        Revoke current link
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent portalContainer={dialogElement}>
                      <AlertDialogTitle>Revoke this share link?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Anyone using the current link will immediately lose access.
                      </AlertDialogDescription>
                      <div className="mt-6 flex justify-end gap-3">
                        <AlertDialogCancel className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            revokeShare.mutate(activeShare.id);
                            setCreatedUrl(null);
                          }}
                          className="min-h-11 rounded-lg bg-destructive px-4 text-sm font-semibold text-white"
                        >
                          Revoke link
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={createShare.isPending}
                  onClick={() =>
                    createShare.mutate(
                      { expiration },
                      { onSuccess: (share) => setCreatedUrl(share.url) },
                    )
                  }
                  className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
                >
                  {createShare.isPending ? 'Creating link…' : 'Create share link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
