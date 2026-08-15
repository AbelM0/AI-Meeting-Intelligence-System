import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  getMeetingJobId,
  MEETING_PROCESSING_JOB,
  MEETING_PROCESSING_QUEUE,
  type MeetingProcessingJobData,
} from './jobs.constants';
import { producerRedisConnection } from './redis-connection';

@Injectable()
export class MeetingQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MeetingQueueService.name);
  private readonly queue: Queue<MeetingProcessingJobData>;

  constructor(config: ConfigService) {
    this.queue = new Queue<MeetingProcessingJobData>(MEETING_PROCESSING_QUEUE, {
      connection: producerRedisConnection(config),
    });
    this.queue.on('error', (error) => {
      this.logger.warn(
        `Redis producer connection error: ${error.message || 'connection unavailable'}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  async enqueue(meetingId: string, options: { forceTranscription?: boolean } = {}): Promise<void> {
    await this.waitUntilReady();
    const jobId = getMeetingJobId(meetingId);
    const existingJob = await this.queue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'completed' || state === 'failed') {
        await existingJob.remove();
      } else {
        throw new Error(`Meeting queue job ${jobId} is already ${state}.`);
      }
    }

    await this.queue.add(
      MEETING_PROCESSING_JOB,
      {
        meetingId,
        ...(options.forceTranscription ? { forceTranscription: true } : {}),
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { age: 3_600, count: 100 },
        removeOnFail: { age: 86_400, count: 100 },
      },
    );

    this.logger.log(`Queued meeting ${meetingId} as ${jobId}.`);
  }

  private async waitUntilReady(): Promise<void> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.queue.waitUntilReady(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Redis did not become ready within 2500ms.')),
            2_500,
          );
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
