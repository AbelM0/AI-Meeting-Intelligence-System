import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

function configuredRedisConnection(config: ConfigService): RedisOptions {
  const redisUrl = config.get<string>('REDIS_URL');
  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: Number(config.get<string>('REDIS_PORT', '6379')),
  };
}

export function workerRedisConnection(config: ConfigService): RedisOptions {
  return {
    ...configuredRedisConnection(config),
    connectTimeout: 2_000,
    maxRetriesPerRequest: null,
  };
}

export function producerRedisConnection(config: ConfigService): RedisOptions {
  return {
    ...configuredRedisConnection(config),
    connectTimeout: 2_000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  };
}
