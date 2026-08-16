import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { MeetingRecord } from '@meeting-intelligence/database';
import {
  confirmAudioUploadSchema,
  createMeetingSchema,
  meetingListQuerySchema,
  requestAudioUploadSchema,
  updateMeetingSpeakerSchema,
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
  MeetingListResponse,
  MeetingStatusResponse,
  TranscriptResponse,
  TranscriptSpeaker,
} from '@meeting-intelligence/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MeetingsService } from './meetings.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user';

@Controller('meetings')
@UseGuards(ClerkAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createMeetingSchema)) input: CreateMeetingInput,
  ): Promise<MeetingRecord> {
    return this.meetingsService.create(user.clerkUserId, input);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(meetingListQuerySchema)) query: MeetingListQueryInput,
  ): Promise<MeetingListResponse> {
    return this.meetingsService.findAll(user.clerkUserId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingRecord> {
    return this.meetingsService.findOne(user.clerkUserId, id);
  }

  @Get(':id/status')
  getStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingStatusResponse> {
    return this.meetingsService.getStatus(user.clerkUserId, id);
  }

  @Get(':id/transcript')
  getTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TranscriptResponse> {
    return this.meetingsService.getTranscript(user.clerkUserId, id);
  }

  @Patch(':meetingId/speakers/:speakerId')
  updateSpeaker(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', new ParseUUIDPipe({ version: '4' })) meetingId: string,
    @Param('speakerId', new ParseUUIDPipe({ version: '4' })) speakerId: string,
    @Body(new ZodValidationPipe(updateMeetingSpeakerSchema)) input: UpdateMeetingSpeakerInput,
  ): Promise<TranscriptSpeaker> {
    return this.meetingsService.updateSpeaker(user.clerkUserId, meetingId, speakerId, input);
  }

  @Post(':id/process')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  process(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingProcessResponse> {
    return this.meetingsService.process(user.clerkUserId, id);
  }

  @Post(':id/retry')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  retry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingProcessResponse> {
    return this.meetingsService.retry(user.clerkUserId, id);
  }

  @Post(':id/reprocess-transcription')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  reprocessTranscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingProcessResponse> {
    return this.meetingsService.reprocessTranscription(user.clerkUserId, id);
  }

  @Post(':id/reprocess')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  reprocess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingProcessResponse> {
    return this.meetingsService.reprocessTranscription(user.clerkUserId, id);
  }

  @Post(':id/audio/upload-url')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createAudioUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(requestAudioUploadSchema)) input: RequestAudioUploadInput,
  ): Promise<AudioUploadAuthorization> {
    return this.meetingsService.createAudioUpload(user.clerkUserId, id, input);
  }

  @Post(':id/audio/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirmAudioUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(confirmAudioUploadSchema)) input: ConfirmAudioUploadInput,
  ): Promise<MeetingRecord> {
    return this.meetingsService.confirmAudioUpload(user.clerkUserId, id, input);
  }

  @Get(':id/audio/url')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getAudioUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AudioPlaybackAuthorization> {
    return this.meetingsService.getAudioPlaybackUrl(user.clerkUserId, id);
  }

  @Delete(':id/audio')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAudio(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.meetingsService.removeAudio(user.clerkUserId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.meetingsService.remove(user.clerkUserId, id);
  }
}
