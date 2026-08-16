const REQUIRED_SERVER_ENV = [
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_WEBHOOK_SECRET',
  'CLERK_AUTHORIZED_PARTIES',
] as const;

export function validateServerEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_SERVER_ENV.filter(
    (key) => typeof config[key] !== 'string' || config[key].trim() === '',
  );
  if (missing.length > 0)
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  return config;
}
