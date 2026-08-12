import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type MeetingRecord } from '@meeting-intelligence/database';
import type { CreateMeetingInput } from '@meeting-intelligence/schemas';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.meeting.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Meeting not found.');
      }

      throw error;
    }
  }
}
