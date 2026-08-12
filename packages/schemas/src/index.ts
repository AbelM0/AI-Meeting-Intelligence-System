import { z } from 'zod';

export const workspaceInfoSchema = z.object({
  name: z.string().min(1),
});

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export const meetingStatusSchema = z.enum([
  'UPLOADED',
  'QUEUED',
  'PREPROCESSING',
  'TRANSCRIBING',
  'ANALYZING',
  'COMPLETED',
  'FAILED',
]);

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1, 'Meeting title is required.').max(200),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type MeetingStatusValue = z.infer<typeof meetingStatusSchema>;
