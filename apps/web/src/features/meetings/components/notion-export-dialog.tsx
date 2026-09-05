'use client';

import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  PlugIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  useDisconnectNotion,
  useExportActionItemsToNotion,
  useNotionConnection,
  useNotionPages,
  useStartNotionOAuth,
} from '../hooks/use-meetings';

type OAuthNotice = 'connected' | 'cancelled' | 'expired' | 'failed' | 'invalid_state' | null;

export function NotionExportDialog({
  meetingId,
  actionItemCount,
  open,
  oauthNotice,
  onClose,
}: Readonly<{
  meetingId: string;
  actionItemCount: number;
  open: boolean;
  oauthNotice: OAuthNotice;
  onClose: () => void;
}>) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const connection = useNotionConnection(open);
  const connectedWorkspace = connection.data?.connected ? connection.data : null;
  const connected = Boolean(connectedWorkspace);
  const pages = useNotionPages(debouncedSearch, open && connected);
  const startOAuth = useStartNotionOAuth();
  const disconnect = useDisconnectNotion();
  const exportMutation = useExportActionItemsToNotion(meetingId);

  useEffect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [dialog, open]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const pageOptions = useMemo(() => {
    const seen = new Set<string>();
    return (pages.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((page) => (seen.has(page.id) ? false : (seen.add(page.id), true)));
  }, [pages.data]);

  function resetExport() {
    exportMutation.reset();
    setSelectedPageId(null);
  }

  function closeDialog() {
    resetExport();
    setSearch('');
    setDebouncedSearch('');
    onClose();
  }

  return (
    <dialog
      ref={setDialog}
      className="modal-surface w-[min(94vw,42rem)] overflow-visible rounded-lg bg-popover p-0 text-foreground shadow-2xl backdrop:bg-[#111827]/45"
      aria-labelledby="notion-export-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div className="max-h-[90dvh] overflow-y-auto rounded-lg">
        <header className="flex items-start justify-between gap-4 border-b px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                <PlugIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 id="notion-export-title" className="text-xl font-semibold tracking-[-0.02em]">
                  Export to Notion
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Create a checklist page with all {actionItemCount} action items and their details.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close Notion export"
          >
            <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
          </button>
        </header>

        <div className="p-5 sm:p-7">
          {oauthNotice && oauthNotice !== 'connected' ? (
            <p
              className="mb-5 rounded-lg bg-warning-surface p-4 text-sm leading-6 text-warning"
              role="status"
            >
              {oauthNotice === 'cancelled'
                ? 'Notion connection was cancelled. You can try again when you are ready.'
                : oauthNotice === 'expired'
                  ? 'The connection request expired. Start a new connection to continue.'
                  : 'Notion could not be connected. Check the pages you grant access to and try again.'}
            </p>
          ) : null}

          {connection.isPending ? (
            <div className="space-y-3" aria-label="Loading Notion connection">
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-11 animate-pulse rounded-lg bg-muted" />
              <div className="h-44 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : connection.isError ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              <p>
                {getApiErrorMessage(connection.error, 'Notion connection status is unavailable.')}
              </p>
              <button
                type="button"
                onClick={() => void connection.refetch()}
                className="mt-3 min-h-11 rounded-lg bg-popover px-4 font-semibold text-foreground"
              >
                Try again
              </button>
            </div>
          ) : !connected ? (
            <div className="py-4 sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8">
              <div>
                <h3 className="font-semibold">Connect your workspace</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Notion will ask which pages this app can access. Your meeting audio is never sent.
                </p>
              </div>
              <button
                type="button"
                disabled={startOAuth.isPending}
                onClick={() => startOAuth.mutate(meetingId)}
                className="mt-5 min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 sm:mt-0"
              >
                {startOAuth.isPending ? 'Connecting...' : 'Connect Notion'}
              </button>
            </div>
          ) : exportMutation.data ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-success-surface text-success">
                <CheckCircleIcon className="h-6 w-6" weight="duotone" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Checklist created</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {exportMutation.data.pageTitle} is ready in Notion. This is a snapshot, so later
                edits here will not change it.
              </p>
              <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resetExport}
                  className="min-h-11 rounded-lg border bg-popover px-5 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                >
                  Export another copy
                </button>
                <a
                  href={exportMutation.data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Open in Notion
                  <ArrowSquareOutIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {connectedWorkspace?.workspaceName ?? 'Connected workspace'}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {connectedWorkspace?.workspaceId}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disconnect.isPending}
                  onClick={() =>
                    disconnect.mutate(undefined, {
                      onSuccess: () => {
                        setSelectedPageId(null);
                        setSearch('');
                      },
                    })
                  }
                  className="min-h-11 self-start rounded-lg px-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
                >
                  {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>

              <div className="mt-5">
                <label htmlFor="notion-page-search" className="text-sm font-semibold">
                  Choose a parent page
                </label>
                <div className="relative mt-2">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    id="notion-page-search"
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setSelectedPageId(null);
                    }}
                    placeholder="Search accessible Notion pages"
                    className="min-h-11 w-full rounded-lg border bg-muted py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              </div>

              <div
                className="mt-4 max-h-64 overflow-y-auto overscroll-contain rounded-lg border"
                role="listbox"
                aria-label="Notion pages"
              >
                {pages.isPending ? (
                  <div className="space-y-px" aria-label="Loading Notion pages">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-14 animate-pulse bg-muted" />
                    ))}
                  </div>
                ) : pages.isError ? (
                  <div className="p-4 text-sm text-destructive" role="alert">
                    <p>{getApiErrorMessage(pages.error, 'Notion pages could not be loaded.')}</p>
                    <button
                      type="button"
                      onClick={() => void pages.refetch()}
                      className="mt-3 min-h-11 font-semibold text-foreground"
                    >
                      Try again
                    </button>
                  </div>
                ) : pageOptions.length === 0 ? (
                  <div className="p-5 text-sm leading-6 text-muted-foreground">
                    <p className="font-semibold text-foreground">No accessible pages found</p>
                    <p className="mt-1">
                      Reconnect Notion and grant this app access to a page where the checklist can
                      be created.
                    </p>
                  </div>
                ) : (
                  <>
                    {pageOptions.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        role="option"
                        aria-selected={selectedPageId === page.id}
                        onClick={() => setSelectedPageId(page.id)}
                        className={`flex min-h-14 w-full items-center gap-3 border-b px-4 py-3 text-left transition last:border-b-0 ${selectedPageId === page.id ? 'bg-accent text-accent-foreground' : 'bg-popover hover:bg-muted'}`}
                      >
                        <FileTextIcon
                          className="h-4 w-4 shrink-0"
                          weight={selectedPageId === page.id ? 'fill' : 'regular'}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {page.title}
                        </span>
                        {selectedPageId === page.id ? (
                          <CheckCircleIcon
                            className="h-4 w-4 shrink-0"
                            weight="fill"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    ))}
                    {pages.hasNextPage ? (
                      <button
                        type="button"
                        disabled={pages.isFetchingNextPage}
                        onClick={() => void pages.fetchNextPage()}
                        className="min-h-11 w-full bg-muted px-4 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:cursor-wait"
                      >
                        {pages.isFetchingNextPage ? 'Loading more...' : 'Load more pages'}
                      </button>
                    ) : null}
                  </>
                )}
              </div>

              {exportMutation.isError ? (
                <p
                  className="mt-4 rounded-lg bg-destructive/10 p-4 text-sm leading-6 text-destructive"
                  role="alert"
                >
                  {getApiErrorMessage(
                    exportMutation.error,
                    'Action items could not be exported to Notion.',
                  )}
                </p>
              ) : null}

              <div className="mt-5 flex justify-end border-t pt-5">
                <button
                  type="button"
                  disabled={!selectedPageId || exportMutation.isPending}
                  onClick={() => selectedPageId && exportMutation.mutate(selectedPageId)}
                  className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {exportMutation.isPending
                    ? 'Creating checklist...'
                    : `Export ${actionItemCount} items`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
