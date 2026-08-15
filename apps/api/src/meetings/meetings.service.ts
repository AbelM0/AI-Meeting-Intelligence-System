import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MeetingStatus,
  Prisma,
  ProcessingJobStatus,
  type MeetingRecord,
} from '@meeting-intelligence/database';
import {
  BYTES_PER_MEGABYTE,
  createConfirmAudioUploadSchema,
  createRequestAudioUploadSchema,
  DEFAULT_MAX_AUDIO_FILE_SIZE_MB,
  getAudioExtension,
  type ConfirmAudioUploadInput,
  type CreateMeetingInput,
  type RequestAudioUploadInput,
} from '@meeting-intelligence/schemas';
import type {
  AudioUploadAuthorization,
  MeetingProcessResponse,
  MeetingStatusResponse,
  TranscriptResponse,
} from '@meeting-intelligence/types';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { MeetingQueueService } from '../jobs/meeting-queue.service';
import { StorageService } from '../storage/storage.service';
import { TranscriptService } from '../transcript/transcript.service';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly meetingQueue: MeetingQueueService,
    private readonly transcript: TranscriptService,
  ) {}

  create(input: CreateMeetingInput): Promise<MeetingRecord> {
    return this.prisma.meeting.create({ data: input });
  }

  findAll(): Promise<MeetingRecord[]> {
    return this.prisma.meeting.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<MeetingRecord> {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });

    if (!meeting) {
      throw new NotFoundException('Meeting not found.');
    }

    return meeting;
  }

  async getStatus(id: string): Promise<MeetingStatusResponse> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        processingJob: {
          select: {
            status: true,
            progress: true,
            currentStage: true,
            error: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!meeting) throw new NotFoundException('Meeting not found.');

    return {
      meetingId: meeting.id,
      status: meeting.status,
      processing: meeting.processingJob
        ? {
            ...meeting.processingJob,
            startedAt: meeting.processingJob.startedAt?.toISOString() ?? null,
            completedAt: meeting.processingJob.completedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  getTranscript(id: string): Promise<TranscriptResponse> {
    return this.transcript.getTranscriptByMeeting(id);
  }

  async process(id: string): Promise<MeetingProcessResponse> {
    await this.prepareProcessing(id, false);
    return this.enqueuePreparedMeeting(id);
  }

  async retry(id: string): Promise<MeetingProcessResponse> {
    await this.prepareProcessing(id, true);
    return this.enqueuePreparedMeeting(id);
  }

  async createAudioUpload(
    id: string,
    input: RequestAudioUploadInput,
  ): Promise<AudioUploadAuthorization> {
    await this.findOne(id);
    const metadata = this.parseUploadRequest(input);
    const extension = getAudioExtension(metadata.fileName);

    if (!extension) {
      throw new BadRequestException('Unsupported audio file extension.');
    }

    const path = `meetings/${id}/${randomUUID()}.${extension}`;
    return this.storage.createSignedUpload(path);
  }

  async confirmAudioUpload(id: string, input: ConfirmAudioUploadInput): Promise<MeetingRecord> {
    const meeting = await this.findOne(id);
    const metadata = this.parseUploadConfirmation(input);
    this.assertMeetingAudioPath(id, metadata.audioPath, metadata.fileName);

    const storedObject = await this.storage.getObjectMetadata(metadata.audioPath);

    if (storedObject.size !== metadata.fileSize) {
      throw new BadRequestException('The uploaded object size does not match the selected file.');
    }

    if (storedObject.contentType?.toLowerCase() !== metadata.mimeType.toLowerCase()) {
      throw new BadRequestException('The uploaded object type does not match the selected file.');
    }

    let updatedMeeting: MeetingRecord;

    try {
      [updatedMeeting] = await this.prisma.$transaction([
        this.prisma.meeting.update({
          where: { id },
          data: {
            audioPath: metadata.audioPath,
            audioFileName: metadata.fileName,
            audioMimeType: metadata.mimeType,
            fileSize: metadata.fileSize,
            duration: null,
            status: MeetingStatus.UPLOADED,
          },
        }),
        this.prisma.processingJob.deleteMany({ where: { meetingId: id } }),
        this.prisma.transcript.deleteMany({ where: { meetingId: id } }),
        this.prisma.meetingSummary.deleteMany({ where: { meetingId: id } }),
        this.prisma.decision.deleteMany({ where: { meetingId: id } }),
        this.prisma.actionItem.deleteMany({ where: { meetingId: id } }),
      ]);
    } catch (error) {
      await this.removeOrphanedObject(metadata.audioPath);
      throw error;
    }

    if (meeting.audioPath && meeting.audioPath !== metadata.audioPath) {
      try {
        await this.storage.removeObject(meeting.audioPath);
      } catch (error) {
        this.logger.error(
          `Meeting ${id} now references its replacement recording, but the previous object could not be removed.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return updatedMeeting;
  }

  async remove(id: string): Promise<void> {
    const meeting = await this.findOne(id);

    try {
      await this.prisma.meeting.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Meeting not found.');
      }

      throw error;
    }

    if (meeting.audioPath) {
      try {
        await this.storage.removeObject(meeting.audioPath);
      } catch (error) {
        this.logger.error(
          `Meeting ${id} was deleted, but its audio object could not be removed.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private get maxAudioFileSizeBytes(): number {
    const configuredValue = Number(
      this.config.get<string>('MAX_AUDIO_FILE_SIZE_MB', String(DEFAULT_MAX_AUDIO_FILE_SIZE_MB)),
    );
    const megabytes =
      Number.isFinite(configuredValue) && configuredValue > 0
        ? configuredValue
        : DEFAULT_MAX_AUDIO_FILE_SIZE_MB;
    return Math.floor(megabytes * BYTES_PER_MEGABYTE);
  }

  private parseUploadRequest(input: RequestAudioUploadInput): RequestAudioUploadInput {
    const result = createRequestAudioUploadSchema(this.maxAudioFileSizeBytes).safeParse(input);
    if (!result.success) throw new BadRequestException('Invalid audio file metadata.');
    return result.data;
  }

  private parseUploadConfirmation(input: ConfirmAudioUploadInput): ConfirmAudioUploadInput {
    const result = createConfirmAudioUploadSchema(this.maxAudioFileSizeBytes).safeParse(input);
    if (!result.success) throw new BadRequestException('Invalid audio upload confirmation.');
    return result.data;
  }

  private assertMeetingAudioPath(id: string, path: string, fileName: string): void {
    const extension = getAudioExtension(fileName);
    const expectedPrefix = `meetings/${id}/`;
    const objectName = path.startsWith(expectedPrefix) ? path.slice(expectedPrefix.length) : '';
    const generatedNamePattern = new RegExp(
      `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.${extension ?? ''}$`,
      'i',
    );

    if (!extension || !generatedNamePattern.test(objectName)) {
      throw new BadRequestException('The audio path is not valid for this meeting.');
    }
  }

  private async removeOrphanedObject(path: string): Promise<void> {
    try {
      await this.storage.removeObject(path);
    } catch (error) {
      this.logger.error(
        `Audio metadata could not be persisted and the uploaded object ${path} could not be cleaned up.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async prepareProcessing(id: string, retry: boolean): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { processingJob: true },
    });

    if (!meeting) throw new NotFoundException('Meeting not found.');
    if (!meeting.audioPath) {
      throw new BadRequestException('Upload a recording before processing this meeting.');
    }

    const activeMeetingStatuses: MeetingStatus[] = [
      MeetingStatus.QUEUED,
      MeetingStatus.PREPROCESSING,
      MeetingStatus.TRANSCRIBING,
      MeetingStatus.ANALYZING,
    ];
    const activeJob =
      meeting.processingJob?.status === ProcessingJobStatus.PENDING ||
      meeting.processingJob?.status === ProcessingJobStatus.PROCESSING;

    if (activeMeetingStatuses.includes(meeting.status) || activeJob) {
      throw new ConflictException('This meeting is already being processed.');
    }

    if (retry && meeting.status !== MeetingStatus.FAILED) {
      throw new ConflictException('Only a failed meeting can be retried.');
    }

    if (!retry && meeting.status !== MeetingStatus.UPLOADED) {
      throw new ConflictException(
        meeting.status === MeetingStatus.FAILED
          ? 'This meeting failed previously. Use retry to process it again.'
          : 'This meeting is not ready to be processed.',
      );
    }

    const expectedStatus = retry ? MeetingStatus.FAILED : MeetingStatus.UPLOADED;
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.meeting.updateMany({
        where: { id, status: expectedStatus },
        data: { status: MeetingStatus.QUEUED },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'This meeting processing state changed. Refresh and try again.',
        );
      }

      await transaction.processingJob.upsert({
        where: { meetingId: id },
        create: {
          meetingId: id,
          status: ProcessingJobStatus.PENDING,
          progress: 0,
          currentStage: MeetingStatus.QUEUED,
        },
        update: {
          status: ProcessingJobStatus.PENDING,
          progress: 0,
          currentStage: MeetingStatus.QUEUED,
          error: null,
          startedAt: null,
          completedAt: null,
        },
      });
    });
  }

  private async enqueuePreparedMeeting(id: string): Promise<MeetingProcessResponse> {
    try {
      await this.meetingQueue.enqueue(id);
    } catch (error) {
      this.logger.error(
        `Meeting ${id} was prepared but could not be added to Redis.`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.prisma.$transaction([
        this.prisma.meeting.updateMany({
          where: { id, status: MeetingStatus.QUEUED },
          data: { status: MeetingStatus.FAILED },
        }),
        this.prisma.processingJob.updateMany({
          where: { meetingId: id, status: ProcessingJobStatus.PENDING },
          data: {
            status: ProcessingJobStatus.FAILED,
            error: 'Processing could not be queued. Retry when the service is available.',
          },
        }),
      ]);
      throw new ServiceUnavailableException(
        'Processing is temporarily unavailable. Please retry shortly.',
      );
    }

    return { meetingId: id, status: MeetingStatus.QUEUED };
  }
}
