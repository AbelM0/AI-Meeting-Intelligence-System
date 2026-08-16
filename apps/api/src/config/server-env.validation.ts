export function validateServerEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = [
    'DATABASE_URL',
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_WEBHOOK_SECRET',
    'CLERK_AUTHORIZED_PARTIES',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEEPGRAM_API_KEY',
    'DEEPGRAM_TRANSCRIPTION_MODEL',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_MODEL',
    'DEEPSEEK_BASE_URL',
    'FRONTEND_URL',
  ] as const;
  const missing: string[] = required.filter(
    (key) => typeof config[key] !== 'string' || config[key].trim() === '',
  );
  const bucketValue = config.SUPABASE_STORAGE_BUCKET || config.SUPABASE_AUDIO_BUCKET;
  const bucket = typeof bucketValue === 'string' ? bucketValue.trim() : '';
  if (!bucket) missing.push('SUPABASE_STORAGE_BUCKET');
  if (!config.REDIS_URL && (!config.REDIS_HOST || !config.REDIS_PORT)) {
    missing.push('REDIS_URL or REDIS_HOST/REDIS_PORT');
  }
  if (missing.length > 0)
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

  const positiveIntegers = {
    MEETING_WORKER_CONCURRENCY: 2,
    MAX_ACTIVE_MEETINGS_PER_USER: 3,
    DEEPGRAM_TIMEOUT_MS: 600_000,
    DEEPSEEK_TIMEOUT_MS: 120_000,
    SUPABASE_TIMEOUT_MS: 15_000,
    API_RATE_LIMIT: 120,
    API_RATE_TTL_MS: 60_000,
    MEETING_JOB_ATTEMPTS: 3,
    MEETING_JOB_BACKOFF_MS: 2_000,
    ABANDONED_UPLOAD_MAX_AGE_HOURS: 24,
  } as const;
  for (const [key, fallback] of Object.entries(positiveIntegers)) {
    const value = config[key] === undefined || config[key] === '' ? fallback : Number(config[key]);
    if (!Number.isInteger(value) || value <= 0)
      throw new Error(`${key} must be a positive integer.`);
    config[key] = value;
  }
  config.SUPABASE_STORAGE_BUCKET = bucket;
  return config;
}
