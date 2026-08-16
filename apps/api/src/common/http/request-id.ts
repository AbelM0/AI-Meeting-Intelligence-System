import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export function resolveRequestId(value: unknown): string {
  if (typeof value === 'string' && /^[a-zA-Z0-9._-]{8,128}$/.test(value)) return value;
  return randomUUID();
}
