import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Prisma can load the repository root .env while its generated client is imported.
// Seed non-empty backend values first so a root placeholder cannot mask apps/api/.env.
const serverEnvPath = resolve(__dirname, '..', '..', '.env');

if (existsSync(serverEnvPath)) {
  const serverEnv = parse(readFileSync(serverEnvPath));

  for (const [key, value] of Object.entries(serverEnv)) {
    if ((!process.env[key] || process.env[key]?.trim() === '') && value.trim() !== '') {
      process.env[key] = value;
    }
  }
}
