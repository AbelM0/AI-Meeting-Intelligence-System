import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkWebhookController } from './clerk-webhook.controller';

void test('an invalid webhook signature cannot mutate users', async () => {
  let mutations = 0;
  const users = {
    syncWebhookUser: () => {
      mutations += 1;
    },
    anonymize: () => {
      mutations += 1;
    },
  };
  const controller = new ClerkWebhookController(
    new ConfigService({ CLERK_WEBHOOK_SECRET: 'whsec_fixture' }),
    users as never,
  );
  const request = {
    headers: { 'content-type': 'application/json' },
    rawBody: Buffer.from(JSON.stringify({ type: 'user.created', data: { id: 'user_a' } })),
  };
  await assert.rejects(() => controller.receive(request as never), BadRequestException);
  assert.equal(mutations, 0);
});
