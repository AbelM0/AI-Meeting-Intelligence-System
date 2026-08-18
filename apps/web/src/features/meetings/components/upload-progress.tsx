import { formatFileSize } from './audio-dropzone';
import type { AudioUploadProgress as Progress } from '../uploads/upload-audio';

type UploadProgressProps = Progress & {
  fileName: string;
  label: string;
};

export function UploadProgress({
  bytesUploaded,
  bytesTotal,
  percentage,
  fileName,
  label,
}: Readonly<UploadProgressProps>) {
  const boundedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="rounded-lg border border-info/35 bg-info-surface p-4" aria-live="polite">
      <div className="flex min-w-0 items-baseline justify-between gap-4">
        <p className="truncate text-sm font-semibold text-foreground">{fileName}</p>
        <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-info">
          {boundedPercentage}%
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-info-surface"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={boundedPercentage}
      >
        <div
          className="h-full rounded-full bg-info transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `${boundedPercentage}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums">
          {formatFileSize(bytesUploaded)} / {formatFileSize(bytesTotal)}
        </span>
      </div>
    </div>
  );
}
