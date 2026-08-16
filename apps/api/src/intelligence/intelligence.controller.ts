import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { updateActionItemSchema, type UpdateActionItemInput } from '@meeting-intelligence/schemas';
import type { ActionItem, MeetingIntelligence } from '@meeting-intelligence/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { IntelligenceService } from './intelligence.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user';

@Controller()
@UseGuards(ClerkAuthGuard)
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get('meetings/:id/intelligence')
  getMeetingIntelligence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingIntelligence> {
    return this.intelligence.getMeetingIntelligence(user.clerkUserId, id);
  }

  @Patch('action-items/:id')
  updateActionItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateActionItemSchema)) input: UpdateActionItemInput,
  ): Promise<ActionItem> {
    return this.intelligence.updateActionItem(user.clerkUserId, id, input);
  }
}
