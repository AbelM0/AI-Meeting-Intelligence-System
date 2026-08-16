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
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  createMeetingShareSchema,
  type CreateMeetingShareInput,
} from '@meeting-intelligence/schemas';
import type {
  MeetingShareCreated,
  MeetingShareSummary,
  PublicMeetingShare,
} from '@meeting-intelligence/types';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SharingService } from './sharing.service';

@Controller('meetings/:meetingId/shares')
@UseGuards(ClerkAuthGuard)
export class MeetingSharesController {
  constructor(private readonly sharing: SharingService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', new ParseUUIDPipe({ version: '4' })) meetingId: string,
    @Body(new ZodValidationPipe(createMeetingShareSchema)) input: CreateMeetingShareInput,
  ): Promise<MeetingShareCreated> {
    return this.sharing.create(user.clerkUserId, meetingId, input);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', new ParseUUIDPipe({ version: '4' })) meetingId: string,
  ): Promise<MeetingShareSummary[]> {
    return this.sharing.list(user.clerkUserId, meetingId);
  }

  @Delete(':shareId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', new ParseUUIDPipe({ version: '4' })) meetingId: string,
    @Param('shareId', new ParseUUIDPipe({ version: '4' })) shareId: string,
  ): Promise<void> {
    await this.sharing.revoke(user.clerkUserId, meetingId, shareId);
  }
}

@Controller('shares')
export class PublicSharesController {
  constructor(private readonly sharing: SharingService) {}

  @Get(':token')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get(@Param('token') token: string): Promise<PublicMeetingShare> {
    return this.sharing.getPublic(token);
  }
}
