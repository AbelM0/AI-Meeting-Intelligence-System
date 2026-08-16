import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { UsersService } from './users.service';

void test('ensureUser does not call Clerk when the local user already exists', async () => {
  let clerkCalls = 0;
  const prisma = { user: { findUnique: () => Promise.resolve({ id: 'user_a' }) } };
  const clerk = {
    client: {
      users: {
        getUser: () => {
          clerkCalls += 1;
          throw new Error('unexpected');
        },
      },
    },
  };
  await new UsersService(prisma as never, clerk as never).ensureUser('user_a');
  assert.equal(clerkCalls, 0);
});

void test('verified deletion handling anonymizes without deleting meetings', async () => {
  let update: unknown;
  const prisma = {
    user: {
      updateMany: (input: unknown) => {
        update = input;
        return Promise.resolve({ count: 1 });
      },
    },
  };
  await new UsersService(prisma as never, {} as never).anonymize('user_a');
  assert.deepEqual(update, {
    where: { id: 'user_a' },
    data: { email: null, name: null, avatarUrl: null },
  });
});
