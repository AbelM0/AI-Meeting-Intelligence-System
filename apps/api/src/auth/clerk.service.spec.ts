import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkService } from './clerk.service';

function service() {
  return new ClerkService(
    new ConfigService({
      CLERK_SECRET_KEY: 'sk_test_fixture',
      CLERK_PUBLISHABLE_KEY: 'pk_test_Zml4dHVyZQ',
      CLERK_AUTHORIZED_PARTIES: 'http://localhost:3000',
    }),
  );
}

void test('rejects a private request with no bearer token', async () => {
  await assert.rejects(() => service().authenticate(undefined), UnauthorizedException);
});

void test('rejects a malformed authorization header', async () => {
  await assert.rejects(() => service().authenticate('Basic fixture'), UnauthorizedException);
});
