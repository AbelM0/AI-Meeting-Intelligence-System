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
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  exportActionItemsToNotionSchema,
  notionPageQuerySchema,
  startNotionOAuthSchema,
  type ExportActionItemsToNotionInput,
  type NotionPageQueryInput,
  type StartNotionOAuthInput,
} from '@meeting-intelligence/schemas';
import type {
  NotionConnectionStatus,
  NotionExportResult,
  NotionOAuthStart,
  NotionPageListResponse,
} from '@meeting-intelligence/types';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NotionService } from './notion.service';

@Controller('integrations/notion')
@UseGuards(ClerkAuthGuard)
export class NotionController {
  constructor(private readonly notion: NotionService) {}

  @Get()
  status(@CurrentUser() user: AuthenticatedUser): Promise<NotionConnectionStatus> {
    return this.notion.status(user.clerkUserId);
  }

  @Post('oauth/start')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startOAuth(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(startNotionOAuthSchema)) input: StartNotionOAuthInput,
  ): Promise<NotionOAuthStart> {
    return this.notion.startOAuth(user.clerkUserId, input.meetingId);
  }

  @Get('pages')
  listPages(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(notionPageQuerySchema)) query: NotionPageQueryInput,
  ): Promise<NotionPageListResponse> {
    return this.notion.listPages(user.clerkUserId, query);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.notion.disconnect(user.clerkUserId);
  }
}

@Controller('integrations/notion/oauth')
export class NotionOAuthController {
  constructor(private readonly notion: NotionService) {}

  @Get('callback')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: { redirect(status: number, url: string): void },
  ): Promise<void> {
    response.redirect(HttpStatus.FOUND, await this.notion.completeOAuth({ code, state, error }));
  }
}

@Controller('meetings/:meetingId/exports/notion')
@UseGuards(ClerkAuthGuard)
export class MeetingNotionExportController {
  constructor(private readonly notion: NotionService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  export(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', new ParseUUIDPipe({ version: '4' })) meetingId: string,
    @Body(new ZodValidationPipe(exportActionItemsToNotionSchema))
    input: ExportActionItemsToNotionInput,
  ): Promise<NotionExportResult> {
    return this.notion.exportActionItems(user.clerkUserId, meetingId, input.parentPageId);
  }
}
