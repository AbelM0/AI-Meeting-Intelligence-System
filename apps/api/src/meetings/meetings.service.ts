import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type MeetingRecord } from '@meeting-intelligence/database';
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
import type { AudioUploadAuthorization } from '@meeting-intelligence/types';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
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
      updatedMeeting = await this.prisma.meeting.update({
        where: { id },
        data: {
          audioPath: metadata.audioPath,
          audioFileName: metadata.fileName,
          audioMimeType: metadata.mimeType,
          fileSize: metadata.fileSize,
          duration: null,
        },
      });
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
}
