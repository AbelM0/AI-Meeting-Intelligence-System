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
