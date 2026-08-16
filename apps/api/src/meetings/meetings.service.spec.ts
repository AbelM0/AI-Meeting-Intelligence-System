import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

function createSpeakerService() {
  const speakers = new Map<
    string,
    {
      id: string;
      meetingId: string;
      providerSpeakerId: number;
      label: string;
      name: string | null;
      createdAt: Date;
      updatedAt: Date;
      userId: string;
    }
  >([
    [
      'speaker-1',
      {
        id: 'speaker-1',
        meetingId: 'meeting-1',
        providerSpeakerId: 0,
        label: 'Speaker 1',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-a',
      },
    ],
  ]);
  const prisma = {
    meetingSpeaker: {
      findFirst: ({
        where,
      }: {
        where: { id: string; meetingId: string; meeting: { userId: string } };
      }) =>
        Promise.resolve(
          [...speakers.values()].find(
            (speaker) =>
              speaker.id === where.id &&
              speaker.meetingId === where.meetingId &&
              speaker.userId === where.meeting.userId,
          ) ?? null,
        ),
      update: ({ where, data }: { where: { id: string }; data: { name: string | null } }) => {
        const speaker = speakers.get(where.id);
        if (!speaker) throw new Error('missing');
        const updated = { ...speaker, name: data.name };
        speakers.set(where.id, updated);
        return Promise.resolve(updated);
      },
    },
  };
  return new MeetingsService(prisma as never, {} as never, {} as never, {} as never, {} as never);
}

void test('speaker rename persists and null restores the generated display label', async () => {
  const service = createSpeakerService();
  const renamed = await service.updateSpeaker('user-a', 'meeting-1', 'speaker-1', { name: 'Abel' });
  assert.equal(renamed.name, 'Abel');
  const reset = await service.updateSpeaker('user-a', 'meeting-1', 'speaker-1', { name: null });
  assert.equal(reset.name ?? reset.label, 'Speaker 1');
});

void test('a speaker cannot be updated through another meeting id', async () => {
  const service = createSpeakerService();
  await assert.rejects(
    () => service.updateSpeaker('user-b', 'meeting-2', 'speaker-1', { name: 'Abel' }),
    NotFoundException,
  );
});

void test('a speaker cannot be updated by another user even with the meeting and speaker ids', async () => {
  const service = createSpeakerService();
  await assert.rejects(
    () => service.updateSpeaker('user-b', 'meeting-1', 'speaker-1', { name: 'Intruder' }),
    NotFoundException,
  );
});

void test('meeting list exposes relation counts without returning relation rows', async () => {
  const now = new Date('2026-08-15T12:00:00.000Z');
  const prisma = {
    meeting: {
      findMany: ({ where }: { where: { userId: string } }) => {
        assert.equal(where.userId, 'user-a');
        return Promise.resolve([
          {
            id: 'meeting-1',
            title: 'Engineering sync',
            audioPath: null,
            audioFileName: null,
            audioMimeType: null,
            fileSize: null,
            duration: 2_880,
            language: 'en',
            status: 'COMPLETED',
            createdAt: now,
            updatedAt: now,
            summary: { overview: 'Authentication migration and release planning' },
            _count: { decisions: 3, actionItems: 6, speakers: 3 },
          },
        ]);
      },
    },
  };
  const service = new MeetingsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const response = await service.findAll('user-a', { limit: 20 });
  const [meeting] = response.items;
  assert.equal(meeting.decisionCount, 3);
  assert.equal(meeting.actionItemCount, 6);
  assert.equal(meeting.speakerCount, 3);
  assert.equal('decisions' in meeting, false);
});
