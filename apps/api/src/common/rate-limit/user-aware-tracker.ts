type TrackerRequest = {
  headers: { authorization?: string };
  user?: { clerkUserId?: string };
  ip?: string;
  socket: { remoteAddress?: string };
};

export function userAwareTracker(rawRequest: Record<string, unknown>): string {
  const request = rawRequest as TrackerRequest;
  const userId = request.user?.clerkUserId;
  if (userId) return `user:${userId}`;

  const token = request.headers.authorization?.match(/^Bearer\s+([^.]+)\.([^.]+)\./i)?.[2];
  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {
        sub?: unknown;
      };
      if (typeof payload.sub === 'string' && payload.sub.length > 0) return `user:${payload.sub}`;
    } catch {
      // Clerk authentication still performs authoritative token verification.
    }
  }

  return `ip:${request.ip || request.socket.remoteAddress || 'unknown'}`;
}
