import { Upload } from 'tus-js-client';

const SUPABASE_SIGNED_TUS_PATH = '/storage/v1/upload/resumable/sign';
const SUPABASE_TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export type AudioUploadProgress = {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
};

type UploadMeetingAudioInput = {
  file: File;
  token: string;
  bucketName: string;
  storagePath: string;
  onProgress?: (progress: AudioUploadProgress) => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export type MeetingAudioUpload = {
  abort: () => Promise<void>;
  completion: Promise<void>;
};

function getTusEndpoint(): string {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!projectUrl) {
    throw new Error('Browser uploads are not configured.');
  }

  const url = new URL(projectUrl);
  if (url.hostname.endsWith('.supabase.co')) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co');
  }
  url.pathname = SUPABASE_SIGNED_TUS_PATH;
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function uploadMeetingAudio({
  file,
  token,
  bucketName,
  storagePath,
  onProgress,
  onSuccess,
  onError,
}: UploadMeetingAudioInput): MeetingAudioUpload {
  let resolveCompletion!: () => void;
  let rejectCompletion!: (error: Error) => void;
  let settled = false;
  const completion = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });

  const upload = new Upload(file, {
    endpoint: getTusEndpoint(),
    headers: {
      'x-signature': token,
    },
    metadata: {
      bucketName,
      objectName: storagePath,
      contentType: file.type,
      cacheControl: '3600',
    },
    uploadSize: file.size,
    chunkSize: SUPABASE_TUS_CHUNK_SIZE,
    retryDelays: [0, 1000, 3000, 5000, 10000],
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    onProgress: (bytesUploaded, bytesTotal) => {
      if (settled) return;
      const percentage = bytesTotal === 0 ? 0 : Math.round((bytesUploaded / bytesTotal) * 100);
      onProgress?.({ bytesUploaded, bytesTotal, percentage });
    },
    onSuccess: () => {
      if (settled) return;
      settled = true;
      onSuccess?.();
      resolveCompletion();
    },
    onError: (cause) => {
      if (settled) return;
      const error = cause instanceof Error ? cause : new Error('The audio upload failed.');
      settled = true;
      onError?.(error);
      rejectCompletion(error);
    },
  });

  void upload
    .findPreviousUploads()
    .then((previousUploads) => {
      if (settled) return;
      const resumableUpload = previousUploads.find(
        (previousUpload) =>
          previousUpload.metadata.bucketName === bucketName &&
          previousUpload.metadata.objectName === storagePath,
      );

      if (resumableUpload) upload.resumeFromPreviousUpload(resumableUpload);
      upload.start();
    })
    .catch((cause: unknown) => {
      if (settled) return;
      const error = cause instanceof Error ? cause : new Error('The audio upload could not start.');
      settled = true;
      onError?.(error);
      rejectCompletion(error);
    });

  return {
    abort: async () => {
      await upload.abort(false);
      if (!settled) {
        settled = true;
        const error = new Error('The audio upload was cancelled.');
        error.name = 'AbortError';
        rejectCompletion(error);
      }
    },
    completion,
  };
}
