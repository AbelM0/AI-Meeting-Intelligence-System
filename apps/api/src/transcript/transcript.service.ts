import { Injectable, NotFoundException } from '@nestjs/common';
import type { Transcript, TranscriptSegment } from '@meeting-intelligence/database';
import type { TranscriptResponse } from '@meeting-intelligence/types';
import type { TranscriptionResult } from '../transcription/types/transcription-result';
import { PrismaService } from '../database/prisma.service';

type TranscriptWithSegments = Transcript & { segments: TranscriptSegment[] };

@Injectable()
export class TranscriptService {
  constructor(private readonly prisma: PrismaService) {}

  async replaceTranscript(
    meetingId: string,
    result: TranscriptionResult,
  ): Promise<TranscriptResponse> {
    const transcript = await this.prisma.$transaction(async (transaction) => {
      const saved = await transaction.transcript.upsert({
        where: { meetingId },
        create: {
          meetingId,
          fullText: result.text,
          language: result.language,
          duration: result.duration,
        },
        update: {
          fullText: result.text,
          language: result.language,
          duration: result.duration,
        },
      });

      await transaction.transcriptSegment.deleteMany({ where: { transcriptId: saved.id } });

      if (result.segments.length > 0) {
        await transaction.transcriptSegment.createMany({
          data: result.segments.map((segment) => ({
            transcriptId: saved.id,
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: segment.text,
            confidence: segment.confidence ?? null,
          })),
        });
      }

      await transaction.meeting.update({
        where: { id: meetingId },
        data: { duration: result.duration },
      });

      return transaction.transcript.findUniqueOrThrow({
        where: { id: saved.id },
        include: { segments: { orderBy: { startTime: 'asc' } } },
      });
    });

    return this.toResponse(transcript);
  }

  async getTranscriptByMeeting(meetingId: string): Promise<TranscriptResponse> {
    const transcript = await this.prisma.transcript.findUnique({
      where: { meetingId },
      include: { segments: { orderBy: { startTime: 'asc' } } },
    });

    if (!transcript) {
      const meetingExists = await this.prisma.meeting.count({ where: { id: meetingId } });
      throw new NotFoundException(
        meetingExists === 0 ? 'Meeting not found.' : 'Transcript is not available yet.',
      );
    }

    return this.toResponse(transcript);
  }

  private toResponse(transcript: TranscriptWithSegments): TranscriptResponse {
    return {
      id: transcript.id,
      meetingId: transcript.meetingId,
      fullText: transcript.fullText,
      language: transcript.language,
      duration: transcript.duration,
      segments: transcript.segments.map((segment) => ({
        id: segment.id,
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        confidence: segment.confidence,
      })),
    };
  }
}
