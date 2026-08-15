import { Injectable, NotFoundException } from '@nestjs/common';
import type { MeetingSpeaker, Transcript, TranscriptSegment } from '@meeting-intelligence/database';
import type { TranscriptResponse } from '@meeting-intelligence/types';
import type { TranscriptionResult } from '../transcription/types/transcription-result';
import { PrismaService } from '../database/prisma.service';

type TranscriptWithRelations = Transcript & {
  meeting: { speakers: MeetingSpeaker[] };
  segments: Array<TranscriptSegment & { speaker: MeetingSpeaker | null }>;
};

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

      const speakerIds = new Set<number>();
      const speakerIdMap = new Map<number, string>();
      for (const speaker of result.speakers) {
        if (speakerIds.has(speaker.providerSpeakerId)) continue;
        speakerIds.add(speaker.providerSpeakerId);
        const savedSpeaker = await transaction.meetingSpeaker.upsert({
          where: {
            meetingId_providerSpeakerId: {
              meetingId,
              providerSpeakerId: speaker.providerSpeakerId,
            },
          },
          create: {
            meetingId,
            providerSpeakerId: speaker.providerSpeakerId,
            label: speaker.label,
          },
          update: { label: speaker.label },
        });
        speakerIdMap.set(speaker.providerSpeakerId, savedSpeaker.id);
      }

      await transaction.meetingSpeaker.deleteMany({
        where:
          speakerIds.size > 0
            ? { meetingId, providerSpeakerId: { notIn: [...speakerIds] } }
            : { meetingId },
      });
      await transaction.transcriptSegment.deleteMany({ where: { transcriptId: saved.id } });

      if (result.segments.length > 0) {
        await transaction.transcriptSegment.createMany({
          data: result.segments.map((segment) => {
            const providerSpeakerId = segment.providerSpeakerId ?? null;
            const speakerId =
              providerSpeakerId === null ? null : (speakerIdMap.get(providerSpeakerId) ?? null);

            if (providerSpeakerId !== null && speakerId === null) {
              throw new Error('The transcription returned a segment for an unknown speaker.');
            }

            return {
              transcriptId: saved.id,
              speakerId,
              startTime: segment.startTime,
              endTime: segment.endTime,
              text: segment.text,
              confidence: segment.confidence ?? null,
            };
          }),
        });
      }

      await transaction.meeting.update({
        where: { id: meetingId },
        data: { duration: result.duration },
      });

      return transaction.transcript.findUniqueOrThrow({
        where: { id: saved.id },
        include: {
          meeting: { select: { speakers: { orderBy: { providerSpeakerId: 'asc' } } } },
          segments: {
            orderBy: { startTime: 'asc' },
            include: { speaker: true },
          },
        },
      });
    });

    return this.toResponse(transcript);
  }

  async getTranscriptByMeeting(meetingId: string): Promise<TranscriptResponse> {
    const transcript = await this.prisma.transcript.findUnique({
      where: { meetingId },
      include: {
        meeting: { select: { speakers: { orderBy: { providerSpeakerId: 'asc' } } } },
        segments: {
          orderBy: { startTime: 'asc' },
          include: { speaker: true },
        },
      },
    });

    if (!transcript) {
      const meetingExists = await this.prisma.meeting.count({ where: { id: meetingId } });
      throw new NotFoundException(
        meetingExists === 0 ? 'Meeting not found.' : 'Transcript is not available yet.',
      );
    }

    return this.toResponse(transcript);
  }

  private toResponse(transcript: TranscriptWithRelations): TranscriptResponse {
    return {
      id: transcript.id,
      meetingId: transcript.meetingId,
      fullText: transcript.fullText,
      language: transcript.language,
      duration: transcript.duration,
      speakers: transcript.meeting.speakers.map((speaker) => this.toSpeakerResponse(speaker)),
      segments: transcript.segments.map((segment) => ({
        id: segment.id,
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        confidence: segment.confidence,
        speakerId: segment.speakerId,
        speaker: segment.speaker ? this.toSpeakerResponse(segment.speaker) : null,
      })),
    };
  }

  private toSpeakerResponse(speaker: MeetingSpeaker) {
    return {
      id: speaker.id,
      providerSpeakerId: speaker.providerSpeakerId,
      label: speaker.label,
      name: speaker.name,
    };
  }
}
