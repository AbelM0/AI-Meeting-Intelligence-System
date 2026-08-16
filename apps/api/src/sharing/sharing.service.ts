import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@meeting-intelligence/database';
import type { CreateMeetingShareInput } from '@meeting-intelligence/schemas';
import type {
  MeetingShareCreated,
  MeetingShareSummary,
  PublicMeetingShare,
} from '@meeting-intelligence/types';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(
    userId: string,
    meetingId: string,
    input: CreateMeetingShareInput,
  ): Promise<MeetingShareCreated> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: { id: true },
    });
    if (!meeting)
      throw new AppError('MEETING_NOT_FOUND', 'Meeting not found.', HttpStatus.NOT_FOUND);

    const token = randomBytes(32).toString('base64url');
    const expiresAt = this.expirationDate(input.expiration);
    const [, share] = await this.prisma.$transaction([
      this.prisma.meetingShare.updateMany({
        where: { meetingId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.meetingShare.create({
        data: { meetingId, tokenHash: this.hashToken(token), expiresAt },
      }),
    ]);
    const frontend = this.config.getOrThrow<string>('FRONTEND_URL').split(',')[0].trim();
    return {
      ...this.toSummary(share),
      url: `${frontend.replace(/\/$/, '')}/share/${token}`,
    };
  }

  async list(userId: string, meetingId: string): Promise<MeetingShareSummary[]> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: { id: true },
    });
    if (!meeting)
      throw new AppError('MEETING_NOT_FOUND', 'Meeting not found.', HttpStatus.NOT_FOUND);
    const shares = await this.prisma.meetingShare.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return shares.map((share) => this.toSummary(share));
  }

  async revoke(userId: string, meetingId: string, shareId: string): Promise<void> {
    const updated = await this.prisma.meetingShare.updateMany({
      where: { id: shareId, meetingId, meeting: { userId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new AppError('SHARE_NOT_FOUND', 'Share link not found.', HttpStatus.NOT_FOUND);
    }
  }

  async getPublic(token: string): Promise<PublicMeetingShare> {
    if (!/^[a-zA-Z0-9_-]{40,128}$/.test(token)) {
      throw new AppError(
        'SHARE_NOT_FOUND',
        'This shared meeting is no longer available.',
        HttpStatus.NOT_FOUND,
      );
    }
    const share = await this.prisma.meetingShare.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        meeting: {
          select: {
            title: true,
            duration: true,
            createdAt: true,
            summary: true,
            decisions: {
              orderBy: { createdAt: 'asc' },
              include: { sourceSegment: { select: { id: true, startTime: true, endTime: true } } },
            },
            actionItems: {
              orderBy: { createdAt: 'asc' },
              include: { sourceSegment: { select: { id: true, startTime: true, endTime: true } } },
            },
            speakers: { orderBy: { providerSpeakerId: 'asc' } },
            transcript: {
              include: {
                segments: { orderBy: { startTime: 'asc' }, include: { speaker: true } },
              },
            },
          },
        },
      },
    });
    if (!share || share.revokedAt) {
      throw new AppError(
        'SHARE_NOT_FOUND',
        'This shared meeting is no longer available.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (share.expiresAt && share.expiresAt <= new Date()) {
      throw new AppError(
        'SHARE_EXPIRED',
        'This shared meeting is no longer available.',
        HttpStatus.GONE,
      );
    }

    const meeting = share.meeting;
    return {
      title: meeting.title,
      duration: meeting.duration,
      createdAt: meeting.createdAt.toISOString(),
      expiresAt: share.expiresAt?.toISOString() ?? null,
      summary: meeting.summary
        ? {
            overview: meeting.summary.overview,
            keyTopics: this.stringArray(meeting.summary.keyTopics),
            outcomes: this.stringArray(meeting.summary.outcomes),
            unresolvedIssues: this.stringArray(meeting.summary.unresolvedIssues),
          }
        : null,
      decisions: meeting.decisions.map((decision) => ({
        id: decision.id,
        decision: decision.decision,
        context: decision.context,
        evidence: decision.evidence,
        sourceStartTime: decision.sourceStartTime,
        sourceSegmentId: decision.sourceSegmentId,
        sourceSegment: decision.sourceSegment,
      })),
      actionItems: meeting.actionItems.map((actionItem) => ({
        id: actionItem.id,
        task: actionItem.task,
        owner: actionItem.owner,
        dueDate: actionItem.dueDate,
        priority: actionItem.priority,
        status: actionItem.status,
        evidence: actionItem.evidence,
        sourceStartTime: actionItem.sourceStartTime,
        sourceSegmentId: actionItem.sourceSegmentId,
        sourceSegment: actionItem.sourceSegment,
      })),
      transcript: meeting.transcript
        ? {
            id: meeting.transcript.id,
            meetingId: meeting.transcript.meetingId,
            fullText: meeting.transcript.fullText,
            language: meeting.transcript.language,
            duration: meeting.transcript.duration,
            speakers: meeting.speakers.map((speaker) => ({
              id: speaker.id,
              providerSpeakerId: speaker.providerSpeakerId,
              label: speaker.label,
              name: speaker.name,
            })),
            segments: meeting.transcript.segments.map((segment) => ({
              id: segment.id,
              startTime: segment.startTime,
              endTime: segment.endTime,
              text: segment.text,
              confidence: segment.confidence,
              speakerId: segment.speakerId,
              speaker: segment.speaker
                ? {
                    id: segment.speaker.id,
                    providerSpeakerId: segment.speaker.providerSpeakerId,
                    label: segment.speaker.label,
                    name: segment.speaker.name,
                  }
                : null,
            })),
          }
        : null,
    };
  }

  private expirationDate(expiration: CreateMeetingShareInput['expiration']): Date | null {
    const milliseconds = {
      '24_HOURS': 24 * 60 * 60 * 1_000,
      '7_DAYS': 7 * 24 * 60 * 60 * 1_000,
      '30_DAYS': 30 * 24 * 60 * 60 * 1_000,
      NEVER: null,
    }[expiration];
    return milliseconds === null ? null : new Date(Date.now() + milliseconds);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toSummary(share: {
    id: string;
    expiresAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  }): MeetingShareSummary {
    return {
      id: share.id,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      revokedAt: share.revokedAt?.toISOString() ?? null,
      createdAt: share.createdAt.toISOString(),
    };
  }

  private stringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
