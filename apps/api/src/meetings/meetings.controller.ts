import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { MeetingRecord } from '@meeting-intelligence/database';
import {
  confirmAudioUploadSchema,
  createMeetingSchema,
  requestAudioUploadSchema,
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
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createMeetingSchema)) input: CreateMeetingInput,
  ): Promise<MeetingRecord> {
    return this.meetingsService.create(input);
  }

  @Get()
  findAll(): Promise<MeetingRecord[]> {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<MeetingRecord> {
    return this.meetingsService.findOne(id);
  }

  @Get(':id/status')
  getStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingStatusResponse> {
    return this.meetingsService.getStatus(id);
  }

  @Get(':id/transcript')
  getTranscript(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TranscriptResponse> {
    return this.meetingsService.getTranscript(id);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.ACCEPTED)
  process(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingProcessResponse> {
    return this.meetingsService.process(id);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  retry(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingProcessResponse> {
    return this.meetingsService.retry(id);
  }

  @Post(':id/reprocess-transcription')
  @HttpCode(HttpStatus.ACCEPTED)
  reprocessTranscription(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingProcessResponse> {
    return this.meetingsService.reprocessTranscription(id);
  }

  @Post(':id/audio/upload-url')
  createAudioUpload(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(requestAudioUploadSchema)) input: RequestAudioUploadInput,
  ): Promise<AudioUploadAuthorization> {
    return this.meetingsService.createAudioUpload(id, input);
  }

  @Post(':id/audio/confirm')
  confirmAudioUpload(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(confirmAudioUploadSchema)) input: ConfirmAudioUploadInput,
  ): Promise<MeetingRecord> {
    return this.meetingsService.confirmAudioUpload(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    await this.meetingsService.remove(id);
  }
}
