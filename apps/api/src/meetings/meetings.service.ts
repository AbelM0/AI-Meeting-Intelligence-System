import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpStatus,
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
  type MeetingListQueryInput,
  type RequestAudioUploadInput,
  type UpdateMeetingSpeakerInput,
} from '@meeting-intelligence/schemas';
import type {
  AudioUploadAuthorization,
  AudioPlaybackAuthorization,
  MeetingProcessResponse,
  MeetingStatusResponse,
  MeetingListResponse,
  TranscriptSpeaker,
  TranscriptResponse,
} from '@meeting-intelligence/types';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { MeetingQueueService } from '../jobs/meeting-queue.service';
import { StorageService } from '../storage/storage.service';
import { TranscriptService } from '../transcript/transcript.service';
import { AppError } from '../common/errors/app-error';

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

  create(userId: string, input: CreateMeetingInput): Promise<MeetingRecord> {
    return this.prisma.meeting.create({ data: { ...input, userId } });
  }

  async findAll(userId: string, query: MeetingListQueryInput): Promise<MeetingListResponse> {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const meetings = await this.prisma.meeting.findMany({
      where: {
        userId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: {
        id: true,
        title: true,
        status: true,
        duration: true,
        createdAt: true,
        summary: { select: { overview: true } },
        _count: { select: { decisions: true, actionItems: true, speakers: true } },
      },
    });

    const hasMore = meetings.length > query.limit;
    if (hasMore) meetings.pop();
    const items = meetings.map(({ _count, summary, ...meeting }) => ({
      ...meeting,
      createdAt: meeting.createdAt.toISOString(),
      decisionCount: _count.decisions,
      actionItemCount: _count.actionItems,
      speakerCount: _count.speakers,
      summaryPreview: summary?.overview.slice(0, 180) ?? null,
    }));
    const last = meetings.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async findOne(userId: string, id: string): Promise<MeetingRecord> {
    const meeting = await this.prisma.meeting.findFirst({ where: { id, userId } });

    if (!meeting) {
      throw new AppError('MEETING_NOT_FOUND', 'Meeting not found.', HttpStatus.NOT_FOUND);
    }

    return meeting;
  }

  async getAudioPlaybackUrl(userId: string, id: string): Promise<AudioPlaybackAuthorization> {
    const meeting = await this.findOne(userId, id);
    if (!meeting.audioPath) {
      throw new AppError(
        'AUDIO_NOT_FOUND',
        'This meeting does not have a recording.',
        HttpStatus.NOT_FOUND,
      );
    }
    const expiresIn = 300;
    const url = await this.storage.createSignedReadUrl(meeting.audioPath, expiresIn);
    return { url, expiresIn };
  }

  async removeAudio(userId: string, id: string): Promise<void> {
    const meeting = await this.findOne(userId, id);
    if (!meeting.audioPath) {
      throw new AppError(
        'AUDIO_NOT_FOUND',
        'This meeting does not have a recording.',
        HttpStatus.NOT_FOUND,
      );
    }
    const activeStatuses: MeetingStatus[] = [
      MeetingStatus.QUEUED,
      MeetingStatus.PREPROCESSING,
      MeetingStatus.TRANSCRIBING,
      MeetingStatus.ANALYZING,
    ];
    const active = activeStatuses.includes(meeting.status);
    if (active) {
      throw new AppError(
        'MEETING_ALREADY_PROCESSING',
        'The recording cannot be deleted while processing is active.',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.$transaction([
      this.prisma.processingJob.deleteMany({ where: { meetingId: id } }),
      this.prisma.transcript.deleteMany({ where: { meetingId: id } }),
      this.prisma.meetingSpeaker.deleteMany({ where: { meetingId: id } }),
      this.prisma.meetingSummary.deleteMany({ where: { meetingId: id } }),
      this.prisma.decision.deleteMany({ where: { meetingId: id } }),
      this.prisma.actionItem.deleteMany({ where: { meetingId: id } }),
      this.prisma.meeting.update({
        where: { id },
        data: {
          audioPath: null,
          audioFileName: null,
          audioMimeType: null,
          fileSize: null,
          duration: null,
          status: MeetingStatus.UPLOADED,
        },
      }),
    ]);
    try {
      await this.storage.removeObject(meeting.audioPath);
    } catch (error) {
      this.logger.error(
        JSON.stringify({ meetingId: id, operation: 'audio_cleanup', outcome: 'failed' }),
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async getStatus(userId: string, id: string): Promise<MeetingStatusResponse> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, userId },
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

  async getTranscript(userId: string, id: string): Promise<TranscriptResponse> {
    await this.findOne(userId, id);
    return this.transcript.getTranscriptByMeeting(id);
  }

  async updateSpeaker(
    userId: string,
    meetingId: string,
    speakerId: string,
    input: UpdateMeetingSpeakerInput,
  ): Promise<TranscriptSpeaker> {
    const speaker = await this.prisma.meetingSpeaker.findFirst({
      where: { id: speakerId, meetingId, meeting: { userId } },
    });
    if (!speaker) throw new NotFoundException('Speaker not found.');

    const updated = await this.prisma.meetingSpeaker.update({
      where: { id: speakerId },
      data: { name: input.name },
    });
    return {
      id: updated.id,
      providerSpeakerId: updated.providerSpeakerId,
      label: updated.label,
      name: updated.name,
    };
  }

  async process(userId: string, id: string): Promise<MeetingProcessResponse> {
    await this.prepareProcessing(userId, id, false);
    return this.enqueuePreparedMeeting(id);
  }

  async retry(userId: string, id: string): Promise<MeetingProcessResponse> {
    await this.prepareProcessing(userId, id, true);
    return this.enqueuePreparedMeeting(id);
  }

  async reprocessTranscription(userId: string, id: string): Promise<MeetingProcessResponse> {
    await this.prepareProcessing(userId, id, false, true);
    return this.enqueuePreparedMeeting(id, true);
  }

  async createAudioUpload(
    userId: string,
    id: string,
    input: RequestAudioUploadInput,
  ): Promise<AudioUploadAuthorization> {
    const meeting = await this.findOne(userId, id);
    const metadata = this.parseUploadRequest(input);
    const extension = getAudioExtension(metadata.fileName);

    if (!extension) {
      throw new AppError(
        'UNSUPPORTED_AUDIO_FORMAT',
        'This audio format is not supported.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const folder = `users/${userId}/meetings/${id}`;
    const maxAgeHours = this.config.get<number>('ABANDONED_UPLOAD_MAX_AGE_HOURS', 24);
    try {
      const cleaned = await this.storage.cleanupAbandonedUploads(
        folder,
        meeting.audioPath,
        new Date(Date.now() - maxAgeHours * 60 * 60 * 1_000),
      );
      if (cleaned > 0) {
        this.logger.log(
          JSON.stringify({ meetingId: id, operation: 'abandoned_upload_cleanup', cleaned }),
        );
      }
    } catch {
      this.logger.warn(
        JSON.stringify({
          meetingId: id,
          operation: 'abandoned_upload_cleanup',
          outcome: 'deferred',
        }),
      );
    }

    const path = `${folder}/${randomUUID()}.${extension}`;
    return this.storage.createSignedUpload(path);
  }

  async confirmAudioUpload(
    userId: string,
    id: string,
    input: ConfirmAudioUploadInput,
  ): Promise<MeetingRecord> {
    const meeting = await this.findOne(userId, id);
    const metadata = this.parseUploadConfirmation(input);
    this.assertMeetingAudioPath(userId, id, metadata.audioPath, metadata.fileName);

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
        this.prisma.meetingSpeaker.deleteMany({ where: { meetingId: id } }),
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

  async remove(userId: string, id: string): Promise<void> {
    const meeting = await this.findOne(userId, id);

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

  private assertMeetingAudioPath(userId: string, id: string, path: string, fileName: string): void {
    const extension = getAudioExtension(fileName);
    const expectedPrefix = `users/${userId}/meetings/${id}/`;
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

  private async prepareProcessing(
    userId: string,
    id: string,
    retry: boolean,
    forceTranscription = false,
  ): Promise<void> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, userId },
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
      throw new AppError(
        'MEETING_ALREADY_PROCESSING',
        'This meeting is already being processed.',
        HttpStatus.CONFLICT,
      );
    }

    if (forceTranscription) {
      const forceReprocessableStatuses: MeetingStatus[] = [
        MeetingStatus.UPLOADED,
        MeetingStatus.COMPLETED,
        MeetingStatus.FAILED,
      ];
      if (!forceReprocessableStatuses.includes(meeting.status)) {
        throw new ConflictException('This meeting is not ready to be reprocessed.');
      }
    }

    if (!forceTranscription && retry && meeting.status !== MeetingStatus.FAILED) {
      throw new ConflictException('Only a failed meeting can be retried.');
    }

    if (!forceTranscription && !retry && meeting.status !== MeetingStatus.UPLOADED) {
      throw new ConflictException(
        meeting.status === MeetingStatus.FAILED
          ? 'This meeting failed previously. Use retry to process it again.'
          : 'This meeting is not ready to be processed.',
      );
    }

    const expectedStatus = forceTranscription
      ? meeting.status
      : retry
        ? MeetingStatus.FAILED
        : MeetingStatus.UPLOADED;
    await this.prisma.$transaction(
      async (transaction) => {
        const activeCount = await transaction.meeting.count({
          where: { userId, status: { in: activeMeetingStatuses } },
        });
        const maxActive = this.config.get<number>('MAX_ACTIVE_MEETINGS_PER_USER', 3);
        if (activeCount >= maxActive) {
          throw new AppError(
            'PROCESSING_LIMIT_REACHED',
            `You can process up to ${maxActive} meetings at a time. Try again when one finishes.`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async enqueuePreparedMeeting(
    id: string,
    forceTranscription = false,
  ): Promise<MeetingProcessResponse> {
    try {
      await this.meetingQueue.enqueue(id, { forceTranscription });
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

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString(
      'base64url',
    );
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        createdAt?: unknown;
        id?: unknown;
      };
      const createdAt = typeof value.createdAt === 'string' ? new Date(value.createdAt) : null;
      if (
        !createdAt ||
        Number.isNaN(createdAt.getTime()) ||
        typeof value.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id)
      ) {
        throw new Error('invalid cursor');
      }
      return { createdAt, id: value.id };
    } catch {
      throw new AppError(
        'INVALID_CURSOR',
        'The meeting list cursor is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
