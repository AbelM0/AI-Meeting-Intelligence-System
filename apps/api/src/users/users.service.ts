import { Injectable } from '@nestjs/common';
import type { User as ClerkUser } from '@clerk/backend';
import { PrismaService } from '../database/prisma.service';
import { ClerkService } from '../auth/clerk.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clerk: ClerkService,
  ) {}

  async ensureUser(clerkUserId: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { id: clerkUserId },
      select: { id: true },
    });
    if (exists) return;
    await this.syncFromClerk(await this.clerk.client.users.getUser(clerkUserId));
  }

  async syncFromClerk(user: ClerkUser): Promise<void> {
    const profile = clerkProfile(user);
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, ...profile },
      update: profile,
    });
  }

  async syncWebhookUser(user: ClerkWebhookUser): Promise<void> {
    const primary = user.email_addresses?.find(
      (email) => email.id === user.primary_email_address_id,
    );
    const email = primary?.email_address ?? user.email_addresses?.[0]?.email_address ?? null;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || null;
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email, name, avatarUrl: user.image_url ?? null },
      update: { email, name, avatarUrl: user.image_url ?? null },
    });
  }

  async anonymize(clerkUserId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: clerkUserId },
      data: { email: null, name: null, avatarUrl: null },
    });
  }
}

type ClerkWebhookUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id: string; email_address: string }>;
};

function clerkProfile(user: ClerkUser) {
  return {
    email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    avatarUrl: user.imageUrl || null,
  };
}
