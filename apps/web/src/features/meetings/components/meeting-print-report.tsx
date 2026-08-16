'use client';

import type { Meeting, Transcript, TranscriptSegment } from '@meeting-intelligence/types';
import { useMeetingIntelligence } from '../hooks/use-meetings';
import { actionItemPriorityDisplay } from '../utils/action-item-display';
import { formatTimestamp } from '../utils/format-timestamp';
import { getSpeakerDisplayName, resolveActionOwnerDisplayName } from '../utils/meeting-display';

const reportDateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function ReportList({ items }: Readonly<{ items: string[] }>) {
  if (items.length === 0) return <p className="report-empty">None recorded.</p>;
  return (
    <ul className="report-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function printableSegments(transcript: Transcript): TranscriptSegment[] {
  if (transcript.segments.length > 0) return transcript.segments;
  if (!transcript.fullText) return [];
  return [
    {
      id: `${transcript.id}-print-full-text`,
      startTime: 0,
      endTime: transcript.duration ?? 0,
      text: transcript.fullText,
      confidence: null,
      speakerId: null,
      speaker: null,
    },
  ];
}

export function MeetingPrintReport({
  meeting,
  transcript,
}: Readonly<{ meeting: Meeting; transcript: Transcript | null }>) {
  const intelligenceQuery = useMeetingIntelligence(meeting.id, meeting.status === 'COMPLETED');
  const intelligence = intelligenceQuery.data;
  if (!intelligence) return null;

  const segments = transcript ? printableSegments(transcript) : [];
  const metadata = [
    reportDateFormatter.format(new Date(meeting.createdAt)),
    meeting.duration ? `${Math.round(meeting.duration / 60)} minutes` : null,
    transcript?.language ? transcript.language.toLocaleUpperCase() : meeting.language?.toLocaleUpperCase(),
    transcript
      ? `${transcript.speakers.length} ${transcript.speakers.length === 1 ? 'speaker' : 'speakers'}`
      : null,
  ].filter(Boolean);

  return (
    <div className="meeting-print-report">
      <table className="report-page-frame" role="presentation">
        <thead aria-hidden="true">
          <tr>
            <td><div className="report-page-spacer report-page-spacer-top" /></td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="report-page-content">
              <article className="report-document">
      <header className="report-header">
        <div className="report-brand">Auralis</div>
        <h1>{meeting.title}</h1>
        <p className="report-subtitle">Meeting intelligence report</p>
        <p className="report-metadata">{metadata.join('  /  ')}</p>
      </header>

      <section className="report-section report-summary">
        <h2>Executive summary</h2>
        <p className="report-lead">{intelligence.summary.overview}</p>
        <div className="report-summary-grid">
          <div>
            <h3>Key topics</h3>
            <ReportList items={intelligence.summary.keyTopics} />
          </div>
          <div>
            <h3>Outcomes</h3>
            <ReportList items={intelligence.summary.outcomes} />
          </div>
          <div>
            <h3>Unresolved issues</h3>
            <ReportList items={intelligence.summary.unresolvedIssues} />
          </div>
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-heading">
          <h2>Key decisions</h2>
          <span>{intelligence.decisions.length}</span>
        </div>
        {intelligence.decisions.length > 0 ? (
          <ol className="report-records">
            {intelligence.decisions.map((decision) => {
              const timestamp = decision.sourceStartTime ?? decision.sourceSegment?.startTime;
              return (
                <li key={decision.id}>
                  <h3>{decision.decision}</h3>
                  {decision.context ? <p>{decision.context}</p> : null}
                  {decision.evidence ? <blockquote>{decision.evidence}</blockquote> : null}
                  {timestamp !== null && timestamp !== undefined ? (
                    <p className="report-reference">Transcript reference: {formatTimestamp(timestamp)}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="report-empty">No decisions were recorded.</p>
        )}
      </section>

      <section className="report-section">
        <div className="report-section-heading">
          <h2>Action items</h2>
          <span>{intelligence.actionItems.length}</span>
        </div>
        {intelligence.actionItems.length > 0 ? (
          <ol className="report-records report-actions">
            {intelligence.actionItems.map((action) => {
              const timestamp = action.sourceStartTime ?? action.sourceSegment?.startTime;
              return (
                <li key={action.id}>
                  <h3>{action.task}</h3>
                  <dl className="report-action-meta">
                    <div>
                      <dt>Owner</dt>
                      <dd>{resolveActionOwnerDisplayName(action.owner, transcript?.speakers ?? [])}</dd>
                    </div>
                    <div>
                      <dt>Due</dt>
                      <dd>{action.dueDate ?? 'No due date'}</dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd>{actionItemPriorityDisplay[action.priority].label}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{humanize(action.status)}</dd>
                    </div>
                  </dl>
                  {action.evidence ? <blockquote>{action.evidence}</blockquote> : null}
                  {timestamp !== null && timestamp !== undefined ? (
                    <p className="report-reference">Transcript reference: {formatTimestamp(timestamp)}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="report-empty">No action items were recorded.</p>
        )}
      </section>

      <section className="report-section report-transcript">
        <div className="report-section-heading">
          <h2>Transcript</h2>
          <span>{segments.length} segments</span>
        </div>
        {segments.length > 0 ? (
          <ol className="report-transcript-rows">
            {segments.map((segment) => (
              <li key={segment.id}>
                <div className="report-transcript-meta">
                  <time dateTime={`PT${Math.max(0, segment.startTime)}S`}>
                    {formatTimestamp(segment.startTime)}
                  </time>
                  <span>
                    {segment.speaker ? getSpeakerDisplayName(segment.speaker) : 'Unknown speaker'}
                  </span>
                </div>
                <p>{segment.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="report-empty">No spoken content was detected.</p>
        )}
      </section>

                <footer className="report-footer">
                  Auralis meeting intelligence / Private report
                </footer>
              </article>
            </td>
          </tr>
        </tbody>
        <tfoot aria-hidden="true">
          <tr>
            <td><div className="report-page-spacer report-page-spacer-bottom" /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
