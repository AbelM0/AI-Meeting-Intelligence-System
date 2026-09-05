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
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET',
    'NOTION_REDIRECT_URI',
    'NOTION_TOKEN_ENCRYPTION_KEY',
  ] as const;
  const missing: string[] = required.filter(
    (key) => typeof config[key] !== 'string' || config[key].trim() === '',
  );
  const bucketValue = config.SUPABASE_STORAGE_BUCKET || config.SUPABASE_AUDIO_BUCKET;
  const bucket = typeof bucketValue === 'string' ? bucketValue.trim() : '';
  if (!bucket) missing.push('SUPABASE_STORAGE_BUCKET');
  const redisUrl = typeof config.REDIS_URL === 'string' ? config.REDIS_URL.trim() : '';
  if (!redisUrl && (!config.REDIS_HOST || !config.REDIS_PORT)) {
    missing.push('REDIS_URL or REDIS_HOST/REDIS_PORT');
  }
  const langSmithTracingValue = config.LANGSMITH_TRACING;
  const langSmithTracing =
    langSmithTracingValue === true ||
    (typeof langSmithTracingValue === 'string' && langSmithTracingValue.toLowerCase() === 'true');
  if (langSmithTracing) {
    for (const key of ['LANGSMITH_API_KEY', 'LANGSMITH_PROJECT'] as const) {
      if (typeof config[key] !== 'string' || config[key].trim() === '') missing.push(key);
    }
  }
  if (missing.length > 0)
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

  if (redisUrl) {
    let parsedRedisUrl: URL;
    try {
      parsedRedisUrl = new URL(redisUrl);
    } catch {
      throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
    }
    if (!['redis:', 'rediss:'].includes(parsedRedisUrl.protocol) || !parsedRedisUrl.hostname) {
      throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
    }
    config.REDIS_URL = redisUrl;
  }

  const serverPort = Number(config.PORT ?? config.API_PORT ?? 3001);
  if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65_535) {
    throw new Error('PORT or API_PORT must be an integer between 1 and 65535.');
  }

  const positiveIntegers = {
    MEETING_WORKER_CONCURRENCY: 2,
    MAX_ACTIVE_MEETINGS_PER_USER: 3,
    DEEPGRAM_TIMEOUT_MS: 600_000,
    DEEPGRAM_NETWORK_RETRY_DELAY_MS: 1_000,
    DEEPSEEK_TIMEOUT_MS: 120_000,
    SUPABASE_TIMEOUT_MS: 15_000,
    API_RATE_LIMIT: 120,
    API_RATE_TTL_MS: 60_000,
    MEETING_JOB_ATTEMPTS: 3,
    MEETING_JOB_BACKOFF_MS: 2_000,
    ABANDONED_UPLOAD_MAX_AGE_HOURS: 24,
    NOTION_TIMEOUT_MS: 15_000,
  } as const;
  for (const [key, fallback] of Object.entries(positiveIntegers)) {
    const value = config[key] === undefined || config[key] === '' ? fallback : Number(config[key]);
    if (!Number.isInteger(value) || value <= 0)
      throw new Error(`${key} must be a positive integer.`);
    config[key] = value;
  }
  config.SUPABASE_STORAGE_BUCKET = bucket;
  config.API_PORT = serverPort;
  config.LANGSMITH_TRACING = langSmithTracing;
  let notionEncryptionKey: Buffer;
  try {
    notionEncryptionKey = Buffer.from(String(config.NOTION_TOKEN_ENCRYPTION_KEY), 'base64');
  } catch {
    throw new Error('NOTION_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  if (notionEncryptionKey.length !== 32) {
    throw new Error('NOTION_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  const configuredUrls = [
    ['NOTION_REDIRECT_URI', String(config.NOTION_REDIRECT_URI)],
    ...String(config.FRONTEND_URL)
      .split(',')
      .map((value) => ['FRONTEND_URL', value.trim()]),
  ] as const;
  for (const [key, value] of configuredUrls) {
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol.');
    } catch {
      throw new Error(`${key} must contain only valid HTTP or HTTPS URLs.`);
    }
  }
  return config;
}
