import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { MeetingStatus, ProcessingJobStatus } from '@meeting-intelligence/database';
import { Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { MEETING_PROCESSING_QUEUE, type MeetingProcessingJobData } from '../jobs.constants';
import { SimulatedPipelineService } from '../simulated-pipeline.service';

type PipelineStage = {
  meetingStatus: MeetingStatus;
  progress: number;
};

const PIPELINE_STAGES: readonly PipelineStage[] = [
  { meetingStatus: MeetingStatus.PREPROCESSING, progress: 10 },
  { meetingStatus: MeetingStatus.TRANSCRIBING, progress: 30 },
  { meetingStatus: MeetingStatus.ANALYZING, progress: 70 },
];

@Injectable()
@Processor(MEETING_PROCESSING_QUEUE, { concurrency: 2 })
export class MeetingProcessor extends WorkerHost {
  private readonly logger = new Logger(MeetingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly simulation: SimulatedPipelineService,
  ) {
    super();
  }

  async process(job: Job<MeetingProcessingJobData>): Promise<void> {
    const { meetingId } = job.data;

    try {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { processingJob: true },
      });

      if (!meeting) throw new UnrecoverableError('Meeting no longer exists.');
      if (!meeting.audioPath) throw new UnrecoverableError('Meeting recording is missing.');
      if (!meeting.processingJob) throw new UnrecoverableError('Processing record is missing.');

      if (
        meeting.status === MeetingStatus.COMPLETED &&
        meeting.processingJob.status === ProcessingJobStatus.COMPLETED
      ) {
        await job.updateProgress(100);
        return;
      }

      await this.prisma.processingJob.update({
        where: { meetingId },
        data: {
          status: ProcessingJobStatus.PROCESSING,
          error: null,
          startedAt: new Date(),
          completedAt: null,
        },
      });

      for (const stage of PIPELINE_STAGES) {
        await this.persistStage(job, meetingId, stage);
        await this.simulation.pauseAfter(stage.meetingStatus);
      }

      await this.prisma.$transaction([
        this.prisma.meeting.update({
          where: { id: meetingId },
          data: { status: MeetingStatus.COMPLETED },
        }),
        this.prisma.processingJob.update({
          where: { meetingId },
          data: {
            status: ProcessingJobStatus.COMPLETED,
            progress: 100,
            currentStage: MeetingStatus.COMPLETED,
            error: null,
            completedAt: new Date(),
          },
        }),
      ]);
      await job.updateProgress(100);
    } catch (error) {
      await this.persistFailure(job, meetingId, error);
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MeetingProcessingJobData> | undefined, error: Error): void {
    this.logger.error(
      `Meeting processing job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }

  private async persistStage(
    job: Job<MeetingProcessingJobData>,
    meetingId: string,
    stage: PipelineStage,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.meeting.update({
        where: { id: meetingId },
        data: { status: stage.meetingStatus },
      }),
      this.prisma.processingJob.update({
        where: { meetingId },
        data: {
          status: ProcessingJobStatus.PROCESSING,
          progress: stage.progress,
          currentStage: stage.meetingStatus,
          error: null,
        },
      }),
    ]);
    await job.updateProgress(stage.progress);
  }

  private async persistFailure(
    job: Job<MeetingProcessingJobData>,
    meetingId: string,
    error: unknown,
  ): Promise<void> {
    const unrecoverable = error instanceof UnrecoverableError;
    const attempts = job.opts.attempts ?? 1;
    const finalAttempt = unrecoverable || job.attemptsMade + 1 >= attempts;
    const meetingExists = await this.prisma.meeting.count({ where: { id: meetingId } });

    if (!meetingExists) return;

    if (finalAttempt) {
      await this.prisma.$transaction([
        this.prisma.meeting.update({
          where: { id: meetingId },
          data: { status: MeetingStatus.FAILED },
        }),
        this.prisma.processingJob.updateMany({
          where: { meetingId },
          data: {
            status: ProcessingJobStatus.FAILED,
            error: 'Meeting processing failed. Retry when ready.',
            completedAt: null,
          },
        }),
      ]);
      return;
    }

    await this.prisma.$transaction([
      this.prisma.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.QUEUED },
      }),
      this.prisma.processingJob.updateMany({
        where: { meetingId },
        data: {
          status: ProcessingJobStatus.PENDING,
          currentStage: MeetingStatus.QUEUED,
          error: null,
        },
      }),
    ]);
  }
}
