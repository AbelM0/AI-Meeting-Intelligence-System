import { Controller, Get } from '@nestjs/common';
import { healthResponseSchema } from '@meeting-intelligence/schemas';
import type { HealthResponse } from '@meeting-intelligence/types';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return healthResponseSchema.parse({ status: 'ok' });
  }
}
