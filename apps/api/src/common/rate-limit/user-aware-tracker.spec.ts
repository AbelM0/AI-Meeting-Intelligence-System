import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { userAwareTracker } from './user-aware-tracker';

void test('rate limiting uses the Clerk subject for authenticated requests', () => {
  const payload = Buffer.from(JSON.stringify({ sub: 'user_123' })).toString('base64url');
  const tracker = userAwareTracker({
    headers: { authorization: `Bearer header.${payload}.signature` },
    socket: {},
  });
  assert.equal(tracker, 'user:user_123');
});

void test('anonymous rate limiting falls back to client IP', () => {
  const tracker = userAwareTracker({ headers: {}, ip: '203.0.113.8', socket: {} });
  assert.equal(tracker, 'ip:203.0.113.8');
});
