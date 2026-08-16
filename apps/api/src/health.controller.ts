import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { healthResponseSchema } from '@meeting-intelligence/schemas';
import type { HealthResponse, ReadinessResponse } from '@meeting-intelligence/types';
import { PrismaService } from './database/prisma.service';
import { MeetingQueueService } from './jobs/meeting-queue.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: MeetingQueueService,
  ) {}

  @Get()
  check(): HealthResponse {
    return healthResponseSchema.parse({ status: 'ok' });
  }

  @Get('ready')
  async ready(
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<ReadinessResponse> {
    const [database, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.queue.ping(),
    ]);
    const checks = {
      database: database.status === 'fulfilled' ? ('ok' as const) : ('unavailable' as const),
      redis: redis.status === 'fulfilled' ? ('ok' as const) : ('unavailable' as const),
    };
    const status = checks.database === 'ok' && checks.redis === 'ok' ? 'ok' : 'unavailable';
    if (status === 'unavailable') response.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status, checks };
  }
}
