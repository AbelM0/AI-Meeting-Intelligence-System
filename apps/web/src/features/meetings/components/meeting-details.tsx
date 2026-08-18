'use client';

import { ArrowLeftIcon, FileAudioIcon, SlidersHorizontalIcon, WarningIcon, XIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiErrorMessage } from '@/lib/api-client';
import { useMeeting, useMeetingIntelligence, useMeetingStatus, useMeetingTranscript } from '../hooks/use-meetings';
import type { EvidenceTarget } from '../utils/meeting-display';
import { AudioRecording } from './audio-recording';
import { AudioPlayer, type AudioSeekTarget } from './audio-player';
import { MeetingActions } from './meeting-actions';
import { MeetingActionItems, MeetingDecisions, MeetingOverview } from './meeting-overview';
import { MeetingPrintReport } from './meeting-print-report';
import { MeetingProcessing } from './meeting-processing';
import { MeetingStatusBadge } from './meeting-status-badge';
import { MeetingTranscript } from './meeting-transcript';

type MeetingTab = 'overview' | 'transcript' | 'decisions' | 'actions';
const dateFormatter = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' });
const EVIDENCE_AUDIO_PREROLL_SECONDS = 3;

export function MeetingDetails({ id }: Readonly<{ id: string }>) {
  const meetingQuery = useMeeting(id);
  const statusQuery = useMeetingStatus(id);
  const currentStatus = statusQuery.data?.status ?? meetingQuery.data?.status;
  const transcriptQuery = useMeetingTranscript(id, currentStatus === 'COMPLETED');
  const intelligenceQuery = useMeetingIntelligence(id, currentStatus === 'COMPLETED');
  const [activeTab, setActiveTab] = useState<MeetingTab>('overview');
  const [focusTarget, setFocusTarget] = useState<EvidenceTarget | null>(null);
  const [audioSeekTarget, setAudioSeekTarget] = useState<AudioSeekTarget | null>(null);
  const evidenceRequestId = useRef(0);
  const [recordingSettingsOpen, setRecordingSettingsOpen] = useState(false);

  useEffect(() => {
    if (!recordingSettingsOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setRecordingSettingsOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [recordingSettingsOpen]);

  if (meetingQuery.isPending) return <div className="space-y-4" aria-label="Loading meeting"><div className="h-5 w-28 animate-pulse rounded bg-muted" /><div className="h-28 animate-pulse rounded-lg bg-popover" /><div className="h-72 animate-pulse rounded-lg bg-popover" /></div>;
  if (meetingQuery.isError) return <div className="border border-destructive/25 bg-destructive/10 p-5 text-destructive" role="alert"><div className="flex items-start gap-3"><WarningIcon className="mt-0.5 h-5 w-5 shrink-0" weight="duotone" aria-hidden="true" /><div><p className="font-semibold">Meeting unavailable</p><p className="mt-1 text-sm">{getApiErrorMessage(meetingQuery.error, 'Return to the meetings page and try again.')}</p></div></div></div>;

  const meeting = meetingQuery.data;
  const currentMeeting = { ...meeting, status: currentStatus ?? meeting.status };
  const transcript = transcriptQuery.data;
  const metadata = [
    dateFormatter.format(new Date(meeting.createdAt)),
    meeting.duration ? `${Math.round(meeting.duration / 60)} min` : null,
    (transcript?.language ?? meeting.language)?.toLocaleUpperCase(),
    transcript ? `${transcript.speakers.length} ${transcript.speakers.length === 1 ? 'speaker' : 'speakers'}` : null,
  ].filter(Boolean).join(' · ');
  const intelligence = intelligenceQuery.data;

  function viewEvidence(target: Omit<EvidenceTarget, 'requestId'>) {
    evidenceRequestId.current += 1;
    setFocusTarget({ ...target, requestId: evidenceRequestId.current });
    if (target.sourceStartTime !== null) setAudioSeekTarget({ seconds: Math.max(0, target.sourceStartTime - EVIDENCE_AUDIO_PREROLL_SECONDS), requestId: evidenceRequestId.current });
    setActiveTab('transcript');
  }

  const sharedIntelligenceProps = { meetingId: meeting.id, speakers: transcript?.speakers ?? [], onViewTranscript: viewEvidence };
  const completed = currentMeeting.status === 'COMPLETED' && Boolean(meeting.audioPath);

  return (
    <>
      <div className="meeting-screen">
        <Link href="/meetings" className="inline-flex h-9 items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeftIcon className="h-4 w-4" weight="bold" aria-hidden="true" />Meetings</Link>
        <header className="mt-2 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-2xl font-semibold tracking-[-0.025em]">{meeting.title}</h1><MeetingStatusBadge status={currentMeeting.status} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{metadata}</p>
          </div>
          {completed ? (
            <div className="flex flex-wrap items-center gap-2" data-no-print>
              <button type="button" onClick={() => setRecordingSettingsOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md border bg-popover px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted">
                <SlidersHorizontalIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
                Recording
              </button>
              <MeetingActions meetingId={meeting.id} meetingTitle={meeting.title} transcriptReady={Boolean(transcript)} />
            </div>
          ) : null}
        </header>

        {!completed ? (
          <section className="mt-5 rounded-lg border bg-popover p-4" aria-labelledby="recording-title">
            <div className="mb-4 flex items-center gap-2"><FileAudioIcon className="h-4 w-4 text-primary" weight="duotone" aria-hidden="true" /><h2 id="recording-title" className="text-sm font-semibold">Recording</h2></div>
            <AudioRecording meeting={currentMeeting} seekTarget={audioSeekTarget} />
          </section>
        ) : null}
        {!completed ? <MeetingProcessing meeting={currentMeeting} /> : null}

        {completed && recordingSettingsOpen ? (
          <div className="fixed inset-0 z-40 bg-[#111827]/40" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRecordingSettingsOpen(false); }}>
            <aside className="modal-surface ml-auto flex h-full w-full max-w-md flex-col bg-popover text-foreground shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="recording-settings-title">
              <header className="flex items-start justify-between gap-4 border-b p-5">
                <div>
                  <h2 id="recording-settings-title" className="text-lg font-semibold tracking-[-0.02em]">Recording settings</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Manage or reprocess the source recording.</p>
                </div>
                <button type="button" autoFocus onClick={() => setRecordingSettingsOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close recording settings">
                  <XIcon className="h-4 w-4" weight="bold" aria-hidden="true" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-5">
                <AudioRecording meeting={currentMeeting} seekTarget={audioSeekTarget} showPlayer={false} />
                <MeetingProcessing meeting={currentMeeting} compact />
              </div>
            </aside>
          </div>
        ) : null}

        {completed ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MeetingTab)} className="mt-5">
            <div className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
              <TabsList className="h-auto min-w-max justify-start gap-6 rounded-none bg-transparent p-0 text-muted-foreground">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-1 py-3 text-sm shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Overview</TabsTrigger>
                <TabsTrigger value="transcript" className="rounded-none border-b-2 border-transparent px-1 py-3 text-sm shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Transcript</TabsTrigger>
                <TabsTrigger value="decisions" className="gap-2 rounded-none border-b-2 border-transparent px-1 py-3 text-sm shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Decisions{intelligence ? <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{intelligence.decisions.length}</span> : null}</TabsTrigger>
                <TabsTrigger value="actions" className="gap-2 rounded-none border-b-2 border-transparent px-1 py-3 text-sm shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Action Items{intelligence ? <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{intelligence.actionItems.length}</span> : null}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="overview" className="mt-0"><MeetingOverview {...sharedIntelligenceProps} onViewDecisions={() => setActiveTab('decisions')} /></TabsContent>
            <TabsContent value="transcript" className="mt-0"><MeetingTranscript meetingId={meeting.id} status={currentMeeting.status} processingError={statusQuery.data?.processing?.error} focusTarget={focusTarget} audioPlayer={<AudioPlayer meetingId={meeting.id} seekTarget={audioSeekTarget} />} /></TabsContent>
            <TabsContent value="decisions" className="mt-0"><MeetingDecisions {...sharedIntelligenceProps} /></TabsContent>
            <TabsContent value="actions" className="mt-0"><MeetingActionItems {...sharedIntelligenceProps} /></TabsContent>
          </Tabs>
        ) : meeting.audioPath ? (
          <MeetingTranscript meetingId={meeting.id} status={currentMeeting.status} processingError={statusQuery.data?.processing?.error} focusTarget={focusTarget} />
        ) : null}
      </div>
      <MeetingPrintReport meeting={currentMeeting} transcript={transcript ?? null} />
    </>
  );
}
