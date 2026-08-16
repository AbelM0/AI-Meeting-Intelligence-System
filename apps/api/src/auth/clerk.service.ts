import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken, type ClerkClient } from '@clerk/backend';
import type { AuthenticatedUser } from './interfaces/authenticated-user';

@Injectable()
export class ClerkService {
  readonly client: ClerkClient;

  constructor(private readonly config: ConfigService) {
    this.client = createClerkClient({
      secretKey: this.required('CLERK_SECRET_KEY'),
      publishableKey: this.required('CLERK_PUBLISHABLE_KEY'),
      jwtKey: this.config.get<string>('CLERK_JWT_KEY') || undefined,
    });
  }

  async authenticate(authorization: string | undefined): Promise<AuthenticatedUser> {
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedException('Authentication required.');

    try {
      const payload: unknown = await verifyToken(match[1], {
        secretKey: this.required('CLERK_SECRET_KEY'),
        jwtKey: this.config.get<string>('CLERK_JWT_KEY') || undefined,
        authorizedParties: this.authorizedParties,
      });
      if (!isSessionPayload(payload)) throw new Error('Token has no subject.');
      return { clerkUserId: payload.sub, sessionId: payload.sid ?? null };
    } catch {
      throw new UnauthorizedException('Invalid or expired session token.');
    }
  }

  private get authorizedParties(): string[] {
    return this.required('CLERK_AUTHORIZED_PARTIES')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  private required(key: string): string {
    const value = this.config.get<string>(key)?.trim();
    if (!value) throw new Error(`${key} is required.`);
    return value;
  }
}

function isSessionPayload(value: unknown): value is { sub: string; sid?: string | null } {
  return (
    typeof value === 'object' && value !== null && 'sub' in value && typeof value.sub === 'string'
  );
}
