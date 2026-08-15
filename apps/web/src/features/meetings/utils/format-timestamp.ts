export function formatTimestamp(seconds: number): string {
  const boundedSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(boundedSeconds / 3_600);
  const minutes = Math.floor((boundedSeconds % 3_600) / 60);
  const remainingSeconds = boundedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
