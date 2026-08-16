'use client';

import { PauseIcon, PlayIcon, SpeakerHighIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAudioPlaybackUrl } from '../hooks/use-meetings';
import { formatTimestamp } from '../utils/format-timestamp';
import { toast } from '@/hooks/use-toast';

export type AudioSeekTarget = { seconds: number; requestId: number };

const playbackRates = ['0.75', '1', '1.25', '1.5', '2'] as const;

export function AudioPlayer({
  meetingId,
  seekTarget,
}: Readonly<{ meetingId: string; seekTarget?: AudioSeekTarget | null }>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const playbackMutation = useAudioPlaybackUrl();
  const requestPlaybackUrl = playbackMutation.mutate;
  const [source, setSource] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState('1');

  const loadSource = useCallback(
    (afterLoad?: (audio: HTMLAudioElement) => void) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (source) {
        afterLoad?.(audio);
        return;
      }
      requestPlaybackUrl(meetingId, {
        onSuccess: ({ url }) => {
          setSource(url);
          audio.src = url;
          audio.load();
          if (afterLoad) {
            audio.addEventListener('loadedmetadata', () => afterLoad(audio), { once: true });
          }
        },
      });
    },
    [meetingId, requestPlaybackUrl, source],
  );

  useEffect(() => {
    if (!seekTarget) return;
    pendingSeek.current = seekTarget.seconds;
    loadSource((audio) => {
      audio.currentTime = Math.min(seekTarget.seconds, audio.duration || seekTarget.seconds);
      setCurrentTime(audio.currentTime);
      pendingSeek.current = null;
    });
  }, [loadSource, seekTarget]);

  function togglePlayback() {
    loadSource((audio) => {
      if (audio.paused) void audio.play();
      else audio.pause();
    });
  }

  function seek(seconds: number) {
    loadSource((audio) => {
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    });
  }

  return (
    <div className="mt-5 border-t border-emerald-200 pt-5">
      <audio
        ref={audioRef}
        src={source ?? undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
          if (pendingSeek.current !== null) {
            audio.currentTime = Math.min(
              pendingSeek.current,
              audio.duration || pendingSeek.current,
            );
            setCurrentTime(audio.currentTime);
            pendingSeek.current = null;
          }
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          if (!source) return;
          setPlaying(false);
          setSource(null);
          toast({ variant: 'destructive', title: "We couldn't play the recording." });
        }}
      />
      <div className="grid items-center gap-3 sm:grid-cols-[44px_auto_minmax(160px,1fr)_112px]">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={playbackMutation.isPending}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#4f46e5] text-white transition hover:bg-[#4338ca] disabled:cursor-wait disabled:opacity-60"
          aria-label={playing ? 'Pause recording' : 'Play recording'}
        >
          {playing ? (
            <PauseIcon className="h-4 w-4" weight="fill" aria-hidden="true" />
          ) : (
            <PlayIcon className="h-4 w-4" weight="fill" aria-hidden="true" />
          )}
        </button>
        <span className="whitespace-nowrap font-mono text-xs font-semibold text-[#374151]">
          {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
        </span>
        <label className="flex min-w-0 items-center gap-2">
          <span className="sr-only">Recording position</span>
          <SpeakerHighIcon className="h-4 w-4 shrink-0 text-[#047857]" weight="duotone" />
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, Math.max(duration, 1))}
            onChange={(event) => seek(Number(event.target.value))}
            className="h-11 min-w-0 flex-1 accent-[#4f46e5]"
          />
        </label>
        <div>
          <span id={`playback-speed-${meetingId}`} className="sr-only">
            Playback speed
          </span>
          <Select
            value={rate}
            onValueChange={(value) => {
              setRate(value);
              if (audioRef.current) audioRef.current.playbackRate = Number(value);
            }}
          >
            <SelectTrigger
              className="min-h-11 border-[#d1d5db] bg-white shadow-none"
              aria-labelledby={`playback-speed-${meetingId}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {playbackRates.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}×
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
