import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';

export type AudioMetadata = {
  durationSeconds: number;
  fileSizeBytes: number;
};

export type LocalAudioInput = {
  filePath: string;
  meetingId: string;
};

export type AudioNormalizationInput = LocalAudioInput & {
  destinationPath: string;
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

  constructor(private readonly config: ConfigService) {}

  async inspectLocalFile(input: LocalAudioInput): Promise<AudioMetadata> {
    await this.verifyBinaries(input.meetingId);
    const fileStats = await stat(input.filePath).catch(() => {
      throw new AudioProcessingError('The recording could not be accessed.');
    });
    const durationSeconds = await this.probeDuration(input.filePath, input.meetingId);

    return {
      durationSeconds,
      fileSizeBytes: fileStats.size,
    };
  }

  async normalizeLocalFile(input: AudioNormalizationInput): Promise<void> {
    await this.verifyBinaries(input.meetingId);
    await this.runCommand(
      this.ffmpegPath,
      [
        '-y',
        '-v',
        'error',
        '-i',
        input.filePath,
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
        input.destinationPath,
      ],
      input.meetingId,
      'audio normalization',
    );
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
            ? 'Audio processing is unavailable because FFmpeg is not installed or configured.'
            : 'Audio processing could not be started.';
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
            operation === 'audio normalization'
              ? 'The recording could not be decoded into a supported speech audio format.'
              : 'Audio processing could not inspect the recording.',
          ),
        );
      });
    });
  }

  private safeCommandDetail(stderr: string): string {
    return stderr.replace(/\s+/g, ' ').trim().slice(0, 240) || 'no diagnostic output';
  }

  private get ffmpegPath(): string {
    return this.config.get<string>('FFMPEG_PATH', 'ffmpeg');
  }

  private get ffprobePath(): string {
    return this.config.get<string>('FFPROBE_PATH', 'ffprobe');
  }
}
