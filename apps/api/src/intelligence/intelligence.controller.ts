import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { updateActionItemSchema, type UpdateActionItemInput } from '@meeting-intelligence/schemas';
import type { ActionItem, MeetingIntelligence } from '@meeting-intelligence/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { IntelligenceService } from './intelligence.service';

@Controller()
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get('meetings/:id/intelligence')
  getMeetingIntelligence(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeetingIntelligence> {
    return this.intelligence.getMeetingIntelligence(id);
  }

  @Patch('action-items/:id')
  updateActionItem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateActionItemSchema)) input: UpdateActionItemInput,
  ): Promise<ActionItem> {
    return this.intelligence.updateActionItemStatus(id, input);
  }
}
