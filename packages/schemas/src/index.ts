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

export const processingJobStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);

export const meetingSummarySchema = z.object({
  overview: z.string().trim().min(1),
  keyTopics: z.array(z.string().trim().min(1)),
  outcomes: z.array(z.string().trim().min(1)),
  unresolvedIssues: z.array(z.string().trim().min(1)),
});

export const decisionSchema = z.object({
  decision: z.string().trim().min(1),
  context: z.string().nullable(),
  evidence: z.string().trim().min(1),
  sourceStartTime: z.number().nonnegative().nullable(),
});

export const decisionsSchema = z.object({
  decisions: z.array(decisionSchema),
});

export const actionItemPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const actionItemStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED']);

export const actionItemSchema = z.object({
  task: z.string().trim().min(1),
  owner: z.string().trim().min(1).nullable(),
  dueDate: z.string().trim().min(1).nullable(),
  priority: actionItemPrioritySchema,
  evidence: z.string().trim().min(1),
  sourceStartTime: z.number().nonnegative().nullable(),
});

export const actionItemsSchema = z.object({
  actionItems: z.array(actionItemSchema),
});

export const updateActionItemSchema = z
  .object({
    task: z.string().trim().min(1, 'Task is required.').max(500).optional(),
    owner: z.string().trim().min(1, 'Owner cannot be empty.').max(200).nullable().optional(),
    dueDate: z.string().trim().min(1, 'Due date cannot be empty.').max(100).nullable().optional(),
    priority: actionItemPrioritySchema.optional(),
    status: actionItemStatusSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be supplied.',
  });

export const updateMeetingSpeakerSchema = z
  .object({
    name: z.string().trim().min(1, 'Speaker name cannot be empty.').max(100).nullable(),
  })
  .strict();

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1, 'Meeting title is required.').max(200),
});

export const meetingListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const shareExpirationSchema = z.enum(['24_HOURS', '7_DAYS', '30_DAYS', 'NEVER']);

export const createMeetingShareSchema = z
  .object({ expiration: shareExpirationSchema.default('7_DAYS') })
  .strict();

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type MeetingListQueryInput = z.infer<typeof meetingListQuerySchema>;
export type ShareExpirationValue = z.infer<typeof shareExpirationSchema>;
export type CreateMeetingShareInput = z.infer<typeof createMeetingShareSchema>;
export type MeetingStatusValue = z.infer<typeof meetingStatusSchema>;
export type ProcessingJobStatusValue = z.infer<typeof processingJobStatusSchema>;
export type MeetingSummaryInput = z.infer<typeof meetingSummarySchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type DecisionsInput = z.infer<typeof decisionsSchema>;
export type ActionItemPriorityValue = z.infer<typeof actionItemPrioritySchema>;
export type ActionItemStatusValue = z.infer<typeof actionItemStatusSchema>;
export type ActionItemInput = z.infer<typeof actionItemSchema>;
export type ActionItemsInput = z.infer<typeof actionItemsSchema>;
export type UpdateActionItemInput = z.infer<typeof updateActionItemSchema>;
export type UpdateMeetingSpeakerInput = z.infer<typeof updateMeetingSpeakerSchema>;

export const DEFAULT_MAX_AUDIO_FILE_SIZE_MB = 50;
export const BYTES_PER_MEGABYTE = 1024 * 1024;
export const DEFAULT_MAX_AUDIO_FILE_SIZE_BYTES =
  DEFAULT_MAX_AUDIO_FILE_SIZE_MB * BYTES_PER_MEGABYTE;

export const AUDIO_FORMATS = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
  m4a: ['audio/mp4', 'audio/m4a', 'audio/x-m4a'],
} as const;

export type AudioExtension = keyof typeof AUDIO_FORMATS;

export const AUDIO_ACCEPT = Object.fromEntries(
  Object.entries(AUDIO_FORMATS).flatMap(([extension, mimeTypes]) =>
    mimeTypes.map((mimeType) => [mimeType, [`.${extension}`]]),
  ),
) as Record<string, string[]>;

export function getAudioExtension(fileName: string): AudioExtension | null {
  const extension = fileName
    .trim()
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/)?.[1];
  return extension && extension in AUDIO_FORMATS ? (extension as AudioExtension) : null;
}

export function isMatchingAudioMimeType(extension: AudioExtension, mimeType: string): boolean {
  return (AUDIO_FORMATS[extension] as readonly string[]).includes(mimeType.toLowerCase());
}

function audioMetadataSchema(maxFileSizeBytes: number) {
  return z
    .object({
      fileName: z.string().trim().min(1, 'File name is required.').max(255),
      mimeType: z.string().trim().toLowerCase().min(1, 'MIME type is required.'),
      fileSize: z
        .number()
        .int()
        .positive('The audio file must not be empty.')
        .max(maxFileSizeBytes, `The audio file exceeds the maximum allowed size.`),
    })
    .superRefine((value, context) => {
      const extension = getAudioExtension(value.fileName);

      if (!extension) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fileName'],
          message: 'Only MP3, WAV, and M4A files are supported.',
        });
        return;
      }

      if (!isMatchingAudioMimeType(extension, value.mimeType)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mimeType'],
          message: `The MIME type does not match the .${extension} file extension.`,
        });
      }
    });
}

export function createRequestAudioUploadSchema(
  maxFileSizeBytes = DEFAULT_MAX_AUDIO_FILE_SIZE_BYTES,
) {
  return audioMetadataSchema(maxFileSizeBytes);
}

export function createConfirmAudioUploadSchema(
  maxFileSizeBytes = DEFAULT_MAX_AUDIO_FILE_SIZE_BYTES,
) {
  return audioMetadataSchema(maxFileSizeBytes).and(
    z.object({
      audioPath: z.string().min(1, 'Audio path is required.'),
    }),
  );
}

export const requestAudioUploadSchema = createRequestAudioUploadSchema();
export const confirmAudioUploadSchema = createConfirmAudioUploadSchema();

export type RequestAudioUploadInput = z.infer<typeof requestAudioUploadSchema>;
export type ConfirmAudioUploadInput = z.infer<typeof confirmAudioUploadSchema>;
