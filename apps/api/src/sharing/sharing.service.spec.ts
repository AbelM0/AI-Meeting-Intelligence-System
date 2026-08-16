import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { SharingService } from './sharing.service';
import { AppError } from '../common/errors/app-error';

function serviceForUser(ownerId: string) {
  let storedHash = '';
  const createdAt = new Date('2026-08-16T12:00:00.000Z');
  const prisma = {
    meeting: {
      findFirst: ({ where }: { where: { userId: string } }) =>
        Promise.resolve(where.userId === ownerId ? { id: 'meeting-id' } : null),
    },
    meetingShare: {
      updateMany: () => Promise.resolve({ count: 0 }),
      create: ({ data }: { data: { tokenHash: string; expiresAt: Date | null } }) => {
        storedHash = data.tokenHash;
        return Promise.resolve({
          id: 'share-id',
          expiresAt: data.expiresAt,
          revokedAt: null,
          createdAt,
        });
      },
    },
    $transaction: (operations: Array<Promise<unknown>>) => Promise.all(operations),
  };
  const config = { getOrThrow: () => 'https://app.example.com' };
  return {
    service: new SharingService(prisma as never, config as never),
    storedHash: () => storedHash,
  };
}

void test('share creation returns a raw token but persists only its SHA-256 hash', async () => {
  const fixture = serviceForUser('user-a');
  const share = await fixture.service.create('user-a', 'meeting-id', { expiration: '7_DAYS' });
  const token = share.url.split('/').at(-1);
  assert.ok(token);
  assert.notEqual(fixture.storedHash(), token);
  assert.equal(fixture.storedHash(), createHash('sha256').update(token).digest('hex'));
});

void test('another user cannot create a share for an owned meeting', async () => {
  const fixture = serviceForUser('user-a');
  await assert.rejects(
    () => fixture.service.create('user-b', 'meeting-id', { expiration: '7_DAYS' }),
    (error: unknown) => error instanceof AppError && error.code === 'MEETING_NOT_FOUND',
  );
});

void test('public share payloads omit private audio and internal relation metadata', async () => {
  const now = new Date('2026-08-16T12:00:00.000Z');
  const prisma = {
    meetingShare: {
      findUnique: () =>
        Promise.resolve({
          expiresAt: null,
          revokedAt: null,
          meeting: {
            title: 'Release review',
            duration: 3_600,
            createdAt: now,
            audioPath: 'private/audio.mp3',
            summary: null,
            decisions: [
              {
                id: 'decision-id',
                meetingId: 'meeting-id',
                decision: 'Ship the candidate',
                context: null,
                evidence: 'Approved',
                sourceStartTime: 42,
                sourceSegmentId: null,
                sourceSegment: null,
                createdAt: now,
                updatedAt: now,
              },
            ],
            actionItems: [],
            speakers: [],
            transcript: null,
          },
        }),
    },
  };
  const service = new SharingService(prisma as never, {} as never);
  const result = await service.getPublic('a'.repeat(43));
  assert.equal('audioPath' in result, false);
  assert.equal('meetingId' in result.decisions[0], false);
  assert.equal('createdAt' in result.decisions[0], false);
});
