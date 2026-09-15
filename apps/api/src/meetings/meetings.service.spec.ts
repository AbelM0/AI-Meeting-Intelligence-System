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

void test('meeting pagination trims the lookahead row and keeps filters and ownership on both sort directions', async () => {
  const createdAt = new Date('2026-09-06T12:00:00.000Z');
  const rows = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'].map((id) => ({
    id, title: 'Planning', status: 'ANALYZING', duration: null, createdAt,
    summary: null, _count: { decisions: 0, actionItems: 0, speakers: 0 },
  }));
  for (const sort of ['NEWEST', 'OLDEST'] as const) {
    const requests: Record<string, unknown>[] = [];
    const prisma = { meeting: { findMany: (request: Record<string, unknown>) => {
      requests.push(request);
      return Promise.resolve(requests.length === 1 ? [...rows] : [rows[1]]);
    } } };
    const service = new MeetingsService(prisma as never, {} as never, {} as never, {} as never, {} as never);
    const query = { limit: 1, search: 'Planning', status: 'PROCESSING' as const, sort };
    const first = await service.findAll('user-a', query);
    assert.equal(first.items.length, 1);
    assert.equal(first.items[0].id, rows[0].id);
    assert.ok(first.nextCursor);
    const second = await service.findAll('user-a', { ...query, cursor: first.nextCursor });
    assert.equal(second.items[0].id, rows[1].id);
    assert.equal(second.nextCursor, null);
    const comparison = sort === 'OLDEST' ? 'gt' : 'lt';
    const direction = sort === 'OLDEST' ? 'asc' : 'desc';
    for (const request of requests) {
      assert.equal(request.take, 2);
      assert.deepEqual(request.orderBy, [{ createdAt: direction }, { id: direction }]);
      const where = request.where as Record<string, unknown>;
      assert.equal(where.userId, 'user-a');
      assert.deepEqual(where.AND, [
        { OR: [
          { title: { contains: 'Planning', mode: 'insensitive' } },
          { summary: { is: { overview: { contains: 'Planning', mode: 'insensitive' } } } },
        ] },
        { status: { in: ['QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'ANALYZING'] } },
      ]);
    }
    assert.deepEqual((requests[1].where as Record<string, unknown>).OR, [
      { createdAt: { [comparison]: createdAt } },
      { createdAt, id: { [comparison]: rows[0].id } },
    ]);
  }
});

void test('empty meeting pages have no next cursor and Ready maps to completed records', async () => {
  const prisma = { meeting: { findMany: ({ where }: { where: { AND: unknown[] } }) => {
    assert.deepEqual(where.AND, [{ status: 'COMPLETED' }]);
    return Promise.resolve([]);
  } } };
  const service = new MeetingsService(prisma as never, {} as never, {} as never, {} as never, {} as never);
  assert.deepEqual(await service.findAll('user-a', { limit: 12, status: 'READY' }), { items: [], nextCursor: null });
});
