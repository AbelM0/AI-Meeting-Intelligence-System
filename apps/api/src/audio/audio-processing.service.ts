import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { StorageService } from '../storage/storage.service';
import {
  DEFAULT_GROQ_MAX_AUDIO_BYTES,
  DEFAULT_TRANSCRIPTION_CHUNK_SECONDS,
} from '../transcription/transcription.constants';
import type { AudioChunk } from './types/audio-chunk';

export type PreparedAudio = {
  workspacePath: string;
  durationSeconds: number;
  chunks: AudioChunk[];
};

export type AudioPreparationInput = {
  meetingId: string;
  audioPath: string;
};

export class AudioProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioProcessingError';
  }
}

type CommandResult = {
  stdout: string;
};

@Injectable()
export class AudioProcessingService {
  private readonly logger = new Logger(AudioProcessingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async prepareAudio(input: AudioPreparationInput): Promise<PreparedAudio> {
    const workspacePath = await mkdtemp(
      join(tmpdir(), `meeting-intelligence-${this.safeMeetingId(input.meetingId)}-`),
    );

    try {
      await this.verifyBinaries(input.meetingId);

      const sourceExtension = this.sourceExtension(input.audioPath);
      const sourcePath = join(workspacePath, `source${sourceExtension}`);
      const normalizedPath = join(workspacePath, 'normalized.mp3');

      await this.storage.downloadObjectToFile(input.audioPath, sourcePath);
      await this.runCommand(
        this.ffmpegPath,
        [
          '-y',
          '-v',
          'error',
          '-i',
          sourcePath,
          '-map',
          '0:a:0',
          '-vn',
          '-ac',
          '1',
          '-ar',
          '16000',
          '-codec:a',
          'libmp3lame',
          '-b:a',
          '64k',
          normalizedPath,
        ],
        input.meetingId,
        'audio normalization',
      );

      const durationSeconds = await this.probeDuration(normalizedPath, input.meetingId);
      const chunks = await this.createChunks({
        meetingId: input.meetingId,
        workspacePath,
        normalizedPath,
        durationSeconds,
      });

      this.logger.log(
        `Audio preprocessing complete meetingId=${input.meetingId} chunks=${chunks.length} duration=${durationSeconds.toFixed(2)}`,
      );

      return { workspacePath, durationSeconds, chunks };
    } catch (error) {
      await this.cleanup(workspacePath);
      throw error;
    }
  }

  async cleanup(workspacePath: string): Promise<void> {
    try {
      await rm(workspacePath, { recursive: true, force: true });
    } catch (error) {
      this.logger.error(
        `Audio temporary workspace cleanup failed workspace=${workspacePath}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async createChunks(input: {
    meetingId: string;
    workspacePath: string;
    normalizedPath: string;
    durationSeconds: number;
  }): Promise<AudioChunk[]> {
    const normalizedSize = (await stat(input.normalizedPath)).size;
    if (normalizedSize <= this.maxAudioBytes) {
      return [
        {
          path: input.normalizedPath,
          index: 0,
          startOffsetSeconds: 0,
          durationSeconds: input.durationSeconds,
        },
      ];
    }

    // MVP chunking is deliberately non-overlapping. It keeps offsets deterministic and avoids
    // duplicate boundary text; semantic sentence segmentation can be added in a later milestone.
    const chunks: AudioChunk[] = [];
    let offsetSeconds = 0;
    let index = 0;

    while (offsetSeconds < input.durationSeconds - 0.005) {
      const remainingSeconds = input.durationSeconds - offsetSeconds;
      let requestedDurationSeconds = Math.min(this.chunkSeconds, remainingSeconds);
      const chunkPath = join(input.workspacePath, `chunk-${String(index).padStart(3, '0')}.mp3`);

      while (true) {
        await rm(chunkPath, { force: true });

        try {
          await this.runCommand(
            this.ffmpegPath,
            [
              '-y',
              '-v',
              'error',
              '-i',
              input.normalizedPath,
              '-ss',
              offsetSeconds.toFixed(3),
              '-t',
              requestedDurationSeconds.toFixed(3),
              '-map',
              '0:a:0',
              '-vn',
              '-ac',
              '1',
              '-ar',
              '16000',
              '-codec:a',
              'libmp3lame',
              '-b:a',
              '64k',
              chunkPath,
            ],
            input.meetingId,
            `audio chunk ${index + 1}`,
          );

          const chunkSize = (await stat(chunkPath)).size;
          if (chunkSize > this.maxAudioBytes) {
            if (requestedDurationSeconds <= 1) {
              throw new AudioProcessingError(
                'The recording could not be divided into provider-safe audio chunks.',
              );
            }

            requestedDurationSeconds = Math.max(1, requestedDurationSeconds / 2);
            continue;
          }

          const actualDurationSeconds = await this.probeDuration(chunkPath, input.meetingId);
          if (actualDurationSeconds <= 0) {
            throw new AudioProcessingError('The recording contains an empty audio chunk.');
          }

          chunks.push({
            path: chunkPath,
            index,
            startOffsetSeconds: offsetSeconds,
            durationSeconds: actualDurationSeconds,
          });
          offsetSeconds += requestedDurationSeconds;
          index += 1;
          break;
        } catch (error) {
          await unlink(chunkPath).catch(() => undefined);
          throw error;
        }
      }
    }

    if (chunks.length === 0) {
      throw new AudioProcessingError('The recording did not contain a usable audio stream.');
    }

    return chunks;
  }

  private async probeDuration(filePath: string, meetingId: string): Promise<number> {
    const result = await this.runCommand(
      this.ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      meetingId,
      'audio duration probe',
    );
    const durationSeconds = Number(result.stdout.trim());

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new AudioProcessingError('The recording duration could not be read.');
    }

    return durationSeconds;
  }

  private async verifyBinaries(meetingId: string): Promise<void> {
    await this.runCommand(this.ffmpegPath, ['-version'], meetingId, 'ffmpeg availability');
    await this.runCommand(this.ffprobePath, ['-version'], meetingId, 'ffprobe availability');
  }

  private runCommand(
    command: string,
    args: string[],
    meetingId: string,
    operation: string,
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk: Buffer | string) => {
        if (stdout.length < 4_000) stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer | string) => {
        if (stderr.length < 4_000) stderr += chunk.toString();
      });

      child.once('error', (error: NodeJS.ErrnoException) => {
        const message =
          error.code === 'ENOENT'
            ? 'Audio preprocessing is unavailable because FFmpeg is not installed or configured.'
            : 'Audio preprocessing could not be started.';
        this.logger.error(
          `Audio command unavailable meetingId=${meetingId} operation=${operation} code=${error.code ?? 'unknown'}`,
        );
        reject(new AudioProcessingError(message));
      });

      child.once('close', (code) => {
        if (code === 0) {
          resolve({ stdout });
          return;
        }

        this.logger.warn(
          `Audio command failed meetingId=${meetingId} operation=${operation} exitCode=${code ?? 'unknown'} detail=${this.safeCommandDetail(stderr)}`,
        );
        reject(
          new AudioProcessingError(
            operation === 'audio normalization' || operation.startsWith('audio chunk')
              ? 'The recording could not be decoded into a supported speech audio format.'
              : 'Audio preprocessing could not inspect the recording.',
          ),
        );
      });
    });
  }

  private safeCommandDetail(stderr: string): string {
    return stderr.replace(/\s+/g, ' ').trim().slice(0, 240) || 'no diagnostic output';
  }

  private sourceExtension(audioPath: string): string {
    const extension = extname(audioPath).toLowerCase();
    return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '.audio';
  }

  private safeMeetingId(meetingId: string): string {
    return meetingId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'unknown';
  }

  private get ffmpegPath(): string {
    return this.config.get<string>('FFMPEG_PATH', 'ffmpeg');
  }

  private get ffprobePath(): string {
    return this.config.get<string>('FFPROBE_PATH', 'ffprobe');
  }

  private get maxAudioBytes(): number {
    const configured = Number(
      this.config.get<string>('GROQ_MAX_AUDIO_BYTES', String(DEFAULT_GROQ_MAX_AUDIO_BYTES)),
    );
    return Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : DEFAULT_GROQ_MAX_AUDIO_BYTES;
  }

  private get chunkSeconds(): number {
    const configured = Number(
      this.config.get<string>(
        'TRANSCRIPTION_CHUNK_SECONDS',
        String(DEFAULT_TRANSCRIPTION_CHUNK_SECONDS),
      ),
    );
    return Number.isFinite(configured) && configured > 0
      ? Math.max(1, configured)
      : DEFAULT_TRANSCRIPTION_CHUNK_SECONDS;
  }
}
