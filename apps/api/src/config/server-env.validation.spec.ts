import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateServerEnv } from './server-env.validation';

function validEnvironment(): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgresql://example',
    CLERK_SECRET_KEY: 'secret',
    CLERK_PUBLISHABLE_KEY: 'publishable',
    CLERK_WEBHOOK_SECRET: 'webhook',
    CLERK_AUTHORIZED_PARTIES: 'https://app.example.com',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    SUPABASE_STORAGE_BUCKET: 'meeting-audio',
    REDIS_URL: 'rediss://redis.example.com:6380',
    DEEPGRAM_API_KEY: 'deepgram',
    DEEPGRAM_TRANSCRIPTION_MODEL: 'nova-3',
    DEEPSEEK_API_KEY: 'deepseek',
    DEEPSEEK_MODEL: 'deepseek-v4-flash',
    DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
    FRONTEND_URL: 'https://app.example.com',
  };
}

void test('environment validation applies conservative production defaults', () => {
  const result = validateServerEnv(validEnvironment());
  assert.equal(result.MEETING_WORKER_CONCURRENCY, 2);
  assert.equal(result.MAX_ACTIVE_MEETINGS_PER_USER, 3);
  assert.equal(result.SUPABASE_TIMEOUT_MS, 15_000);
});

void test('environment validation fails fast for missing required configuration', () => {
  const environment = validEnvironment();
  delete environment.DATABASE_URL;
  assert.throws(() => validateServerEnv(environment), /DATABASE_URL/);
});

void test('environment validation rejects invalid concurrency', () => {
  assert.throws(
    () => validateServerEnv({ ...validEnvironment(), MEETING_WORKER_CONCURRENCY: '0' }),
    /MEETING_WORKER_CONCURRENCY/,
  );
});
