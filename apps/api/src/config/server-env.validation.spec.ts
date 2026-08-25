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

void test('environment validation accepts Render Key Value URLs and trims whitespace', () => {
  const result = validateServerEnv({
    ...validEnvironment(),
    REDIS_URL: '  redis://render-key-value:6379  ',
  });
  assert.equal(result.REDIS_URL, 'redis://render-key-value:6379');
});

void test('environment validation rejects a malformed Redis URL with a useful error', () => {
  assert.throws(
    () => validateServerEnv({ ...validEnvironment(), REDIS_URL: 'REDIS_URL=redis://host:6379' }),
    /REDIS_URL must be a valid redis:\/\/ or rediss:\/\/ URL/,
  );
});

void test('environment validation prefers Render PORT over the local API port', () => {
  const result = validateServerEnv({ ...validEnvironment(), PORT: '10000', API_PORT: '3001' });
  assert.equal(result.API_PORT, 10_000);
});

void test('environment validation rejects an invalid server port', () => {
  assert.throws(
    () => validateServerEnv({ ...validEnvironment(), PORT: 'not-a-port' }),
    /PORT or API_PORT/,
  );
});
