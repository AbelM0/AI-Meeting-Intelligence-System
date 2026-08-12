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
import { createMeetingSchema, type CreateMeetingInput } from '@meeting-intelligence/schemas';
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    await this.meetingsService.remove(id);
  }
}
