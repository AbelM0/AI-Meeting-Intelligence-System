import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyWebhook } from '@clerk/backend/webhooks';
import type { IncomingMessage } from 'node:http';
import { UsersService } from '../users/users.service';

@Controller('webhooks')
export class ClerkWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {}

  @Post('clerk')
  @HttpCode(HttpStatus.NO_CONTENT)
  async receive(@Req() request: RawBodyRequest<IncomingMessage>): Promise<void> {
    const secret = this.config.get<string>('CLERK_WEBHOOK_SECRET')?.trim();
    if (!secret || !request.rawBody) throw new BadRequestException('Webhook verification failed.');

    try {
      const headers = new Headers();
      for (const key of Object.keys(request.headers)) {
        const value = request.headers[key];
        if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
        else if (value !== undefined) headers.set(key, String(value));
      }
      const event = await verifyWebhook(
        new Request('http://localhost/api/v1/webhooks/clerk', {
          method: 'POST',
          headers,
          body: request.rawBody.toString('utf8'),
        }),
        { signingSecret: secret },
      );
      if (event.type === 'user.created' || event.type === 'user.updated') {
        await this.users.syncWebhookUser(event.data);
      } else if (event.type === 'user.deleted' && event.data.id) {
        await this.users.anonymize(event.data.id);
      }
    } catch {
      throw new BadRequestException('Webhook verification failed.');
    }
  }
}
