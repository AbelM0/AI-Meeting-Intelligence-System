export const MEETING_PROCESSING_QUEUE = 'meeting-processing';

export const MEETING_PROCESSING_JOB = 'process-meeting';

export type MeetingProcessingJobData = {
  meetingId: string;
};

export function getMeetingJobId(meetingId: string): string {
  // BullMQ custom IDs cannot contain colons. One stable ID per meeting also
  // prevents duplicate queue entries; failed entries are removed before a manual retry.
  return `meeting-${meetingId}`;
}
