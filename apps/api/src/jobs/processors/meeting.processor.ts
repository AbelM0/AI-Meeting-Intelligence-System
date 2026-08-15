import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { MeetingStatus, ProcessingJobStatus } from '@meeting-intelligence/database';
import { Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { IntelligenceService } from '../../intelligence/intelligence.service';
import {
  INTELLIGENCE_STAGES,
  type IntelligenceStage,
} from '../../intelligence/types/intelligence-result';
import { DeepSeekProviderError } from '../../intelligence/providers/deepseek.provider';
import { TranscriptService } from '../../transcript/transcript.service';
import { TranscriptionProviderError } from '../../transcription/providers/deepgram-transcription.provider';
import {
  TranscriptionService,
  type TranscriptionProgress,
} from '../../transcription/transcription.service';
import { MEETING_PROCESSING_QUEUE, type MeetingProcessingJobData } from '../jobs.constants';

type PipelineStage = {
  meetingStatus: MeetingStatus;
  progress: number;
  currentStage: string;
};

const PREPROCESSING_STAGE: PipelineStage = {
  meetingStatus: MeetingStatus.PREPROCESSING,
  progress: 10,
  currentStage: MeetingStatus.PREPROCESSING,
};
const PERSISTING_STAGE: PipelineStage = {
  meetingStatus: MeetingStatus.ANALYZING,
  progress: 97,
  currentStage: INTELLIGENCE_STAGES.PERSISTING,
};

@Injectable()
@Processor(MEETING_PROCESSING_QUEUE, { concurrency: 2 })
export class MeetingProcessor extends WorkerHost {
  private readonly logger = new Logger(MeetingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcription: TranscriptionService,
    private readonly transcripts: TranscriptService,
    private readonly intelligence: IntelligenceService,
  ) {
    super();
  }

  async process(job: Job<MeetingProcessingJobData>): Promise<void> {
    const { meetingId } = job.data;
    const forceTranscription = job.data.forceTranscription === true;

    try {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { processingJob: true, transcript: true },
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

      if (!meeting.transcript || forceTranscription) {
        await this.persistStage(job, meetingId, PREPROCESSING_STAGE);
        const transcript = await this.transcription.transcribeMeeting(
          {
            meetingId,
            audioPath: meeting.audioPath,
            language: meeting.language,
          },
          (progress) => this.persistTranscriptionProgress(job, meetingId, progress),
        );
        await this.transcripts.replaceTranscript(meetingId, transcript);
      } else {
        this.logger.log(`Skipping transcription meetingId=${meetingId} reason=transcript_exists`);
      }

      const transcript = await this.prisma.transcript.findUniqueOrThrow({
        where: { meetingId },
        include: {
          segments: {
            orderBy: { startTime: 'asc' },
            include: { speaker: true },
          },
        },
      });

      const intelligence = await this.intelligence.analyzeTranscript(
        meetingId,
        transcript,
        (stage, progress) => this.persistIntelligenceStage(job, meetingId, stage, progress),
      );

      await this.persistStage(job, meetingId, PERSISTING_STAGE);
      await this.intelligence.persistIntelligence(meetingId, intelligence);

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
      const processingError = this.toProcessingError(error);
      await this.persistFailure(job, meetingId, processingError);
      throw processingError;
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
          currentStage: stage.currentStage,
          error: null,
        },
      }),
    ]);
    await job.updateProgress(stage.progress);
  }

  private persistIntelligenceStage(
    job: Job<MeetingProcessingJobData>,
    meetingId: string,
    stage: IntelligenceStage,
    progress: number,
  ): Promise<void> {
    return this.persistStage(job, meetingId, {
      meetingStatus: MeetingStatus.ANALYZING,
      progress,
      currentStage: stage,
    });
  }

  private async persistTranscriptionProgress(
    job: Job<MeetingProcessingJobData>,
    meetingId: string,
    progress: TranscriptionProgress,
  ): Promise<void> {
    const boundedProgress = progress.phase === 'completed' ? 68 : 20;

    await this.prisma.$transaction([
      this.prisma.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.TRANSCRIBING },
      }),
      this.prisma.processingJob.update({
        where: { meetingId },
        data: {
          status: ProcessingJobStatus.PROCESSING,
          progress: boundedProgress,
          currentStage: MeetingStatus.TRANSCRIBING,
          error: null,
        },
      }),
    ]);
    await job.updateProgress(boundedProgress);
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
            error: this.safeFailureMessage(error),
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
          progress: 0,
          currentStage: MeetingStatus.QUEUED,
          error: null,
        },
      }),
    ]);
  }

  private toProcessingError(error: unknown): Error {
    if (error instanceof TranscriptionProviderError && !error.retryable) {
      return new UnrecoverableError(error.message);
    }
    if (error instanceof DeepSeekProviderError && !error.retryable) {
      return new UnrecoverableError(error.message);
    }
    return error instanceof Error ? error : new Error('Meeting processing failed.');
  }

  private safeFailureMessage(error: unknown): string {
    if (error instanceof UnrecoverableError) return error.message;
    if (error instanceof TranscriptionProviderError && !error.retryable) return error.message;
    if (error instanceof DeepSeekProviderError) {
      return error.retryable
        ? 'We could not finish meeting intelligence. Your transcript is safe. Retry processing.'
        : error.message;
    }
    return "We couldn't finish processing this meeting. Your transcript is safe. Retry processing.";
  }
}
